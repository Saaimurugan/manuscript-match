/**
 * ProcessRecovery Component
 * Provides options for recovering corrupted or incomplete processes
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Download, 
  CheckCircle,
  XCircle,
  Clock,
  FileX,
  Settings,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useProcessList, 
  useDeleteProcess,
  useProcessStatusOperations,
  useUpdateProcess
} from '../../hooks/useProcessManagement';
import { ProcessStatus, ProcessStep, type Process } from '../../types/process';
import { toast } from 'sonner';

interface ProcessRecoveryProps {
  onClose: () => void;
  className?: string;
}

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline';
  action: (process: Process) => Promise<void>;
}

const ProcessRecovery: React.FC<ProcessRecoveryProps> = ({ onClose, className }) => {
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);
  
  const deleteProcess = useDeleteProcess();
  const updateProcess = useUpdateProcess();
  const { failProcess, cancelProcess } = useProcessStatusOperations();

  // Get processes that might need recovery
  const { data: allProcesses = [], isLoading } = useProcessList();
  
  const problemProcesses = allProcesses.filter(process => {
    // Identify processes that might need recovery
    const now = new Date();
    const updatedAt = new Date(process.updatedAt);
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    
    return (
      process.status === ProcessStatus.FAILED ||
      process.status === ProcessStatus.CANCELLED ||
      (process.status === ProcessStatus.IN_PROGRESS && hoursSinceUpdate > 24) || // Stale processes
      (!process.jobId && process.status !== ProcessStatus.CREATED) || // Missing job ID
      (process.stepData && Object.keys(process.stepData).length === 0 && process.currentStep !== ProcessStep.UPLOAD) // Missing step data
    );
  });

  const getRecoveryActions = (process: Process): RecoveryAction[] => {
    const actions: RecoveryAction[] = [];
    
    // Reset to upload step
    if (process.currentStep !== ProcessStep.UPLOAD) {
      actions.push({
        id: 'reset-upload',
        label: 'Reset to Upload',
        description: 'Start over from the beginning with manuscript upload',
        icon: <RefreshCw className="w-4 h-4" />,
        variant: 'outline',
        action: async (proc) => {
          await updateProcess.mutateAsync({
            processId: proc.id,
            updates: {
              currentStep: ProcessStep.UPLOAD,
              status: ProcessStatus.CREATED,
              stepData: {}
            }
          });
          toast.success('Process reset to upload step');
        }
      });
    }
    
    // Retry current step
    if (process.status === ProcessStatus.FAILED) {
      actions.push({
        id: 'retry-step',
        label: 'Retry Current Step',
        description: `Retry the ${process.currentStep} step`,
        icon: <RefreshCw className="w-4 h-4" />,
        variant: 'default',
        action: async (proc) => {
          await updateProcess.mutateAsync({
            processId: proc.id,
            updates: {
              status: ProcessStatus.IN_PROGRESS
            }
          });
          toast.success('Process marked for retry');
        }
      });
    }
    
    // Mark as completed (if near end)
    if ([ProcessStep.SHORTLIST, ProcessStep.EXPORT].includes(process.currentStep) && 
        process.status !== ProcessStatus.COMPLETED) {
      actions.push({
        id: 'mark-complete',
        label: 'Mark as Complete',
        description: 'Mark this process as completed',
        icon: <CheckCircle className="w-4 h-4" />,
        variant: 'default',
        action: async (proc) => {
          await updateProcess.mutateAsync({
            processId: proc.id,
            updates: {
              status: ProcessStatus.COMPLETED,
              currentStep: ProcessStep.EXPORT
            }
          });
          toast.success('Process marked as completed');
        }
      });
    }
    
    // Cancel process
    if (process.status === ProcessStatus.IN_PROGRESS) {
      actions.push({
        id: 'cancel',
        label: 'Cancel Process',
        description: 'Cancel this process and mark it as cancelled',
        icon: <XCircle className="w-4 h-4" />,
        variant: 'outline',
        action: async (proc) => {
          await cancelProcess.mutateAsync(proc.id);
        }
      });
    }
    
    // Delete process
    actions.push({
      id: 'delete',
      label: 'Delete Process',
      description: 'Permanently delete this process and all its data',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'destructive',
      action: async (proc) => {
        await deleteProcess.mutateAsync(proc.id);
      }
    });
    
    return actions;
  };

  const getProblemDescription = (process: Process): string => {
    const now = new Date();
    const updatedAt = new Date(process.updatedAt);
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    
    if (process.status === ProcessStatus.FAILED) {
      return 'Process failed during execution';
    }
    
    if (process.status === ProcessStatus.CANCELLED) {
      return 'Process was cancelled';
    }
    
    if (process.status === ProcessStatus.IN_PROGRESS && hoursSinceUpdate > 24) {
      return `Process has been inactive for ${Math.round(hoursSinceUpdate)} hours`;
    }
    
    if (!process.jobId && process.status !== ProcessStatus.CREATED) {
      return 'Process is missing external job ID';
    }
    
    if (process.stepData && Object.keys(process.stepData).length === 0 && process.currentStep !== ProcessStep.UPLOAD) {
      return 'Process is missing step data';
    }
    
    return 'Process may need attention';
  };

  const handleActionClick = (process: Process, action: RecoveryAction) => {
    setSelectedProcess(process);
    setSelectedAction(action);
    setActionDialogOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!selectedProcess || !selectedAction) return;
    
    try {
      await selectedAction.action(selectedProcess);
      setActionDialogOpen(false);
      setSelectedProcess(null);
      setSelectedAction(null);
    } catch (error) {
      console.error('Recovery action failed:', error);
      toast.error('Recovery action failed');
    }
  };

  const getStatusIcon = (status: ProcessStatus) => {
    switch (status) {
      case ProcessStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case ProcessStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-gray-600" />;
      case ProcessStatus.IN_PROGRESS:
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Process Recovery</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Process Recovery
              </CardTitle>
              <CardDescription>
                Manage and recover problematic processes
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {problemProcesses.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                All processes are healthy
              </h3>
              <p className="text-gray-600">
                No processes require recovery at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Found {problemProcesses.length} process(es) that may need attention</span>
              </div>
              
              {problemProcesses.map((process) => {
                const actions = getRecoveryActions(process);
                
                return (
                  <div key={process.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(process.status)}
                          <h4 className="font-medium">{process.title}</h4>
                          <Badge variant="outline">{process.status}</Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {getProblemDescription(process)}
                        </p>
                        
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date(process.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h5 className="text-sm font-medium mb-3">Recovery Options:</h5>
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action) => (
                          <Button
                            key={action.id}
                            variant={action.variant}
                            size="sm"
                            onClick={() => handleActionClick(process, action)}
                            className="text-xs"
                          >
                            {action.icon}
                            <span className="ml-1">{action.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction?.description}
              {selectedProcess && (
                <>
                  <br /><br />
                  <strong>Process:</strong> {selectedProcess.title}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActionConfirm}
              className={selectedAction?.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProcessRecovery;