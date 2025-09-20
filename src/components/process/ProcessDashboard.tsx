/**
 * Process Dashboard Component
 * Displays list of user processes with creation and management capabilities
 */

import React, { useState } from 'react';
import { Plus, FileText, Calendar, Clock, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessDashboardSkeleton } from '@/components/ui/skeleton-components';
import { VirtualProcessList } from '@/components/ui/virtual-scroll';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useProcesses, useDeleteProcess } from '@/hooks/useProcesses';
import { useRenderPerformance } from '@/hooks/usePerformance';
import { CreateProcessDialog } from './CreateProcessDialog';
import { EditProcessDialog } from './EditProcessDialog';
import type { Process } from '@/types/api';

interface ProcessDashboardProps {
  onSelectProcess?: (process: Process) => void;
}

export const ProcessDashboard: React.FC<ProcessDashboardProps> = ({ onSelectProcess }) => {
  useRenderPerformance('ProcessDashboard');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const { toast } = useToast();

  const { data: processes, isLoading, error } = useProcesses();
  const deleteProcessMutation = useDeleteProcess();

  const handleDeleteProcess = async (processId: string, processTitle: string) => {
    try {
      await deleteProcessMutation.mutateAsync(processId);
      toast({
        title: 'Process deleted',
        description: `"${processTitle}" has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete process. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: Process['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepProgress = (currentStep: string) => {
    const stepOrder = getStepOrder(currentStep);
    return Math.min((stepOrder / 9) * 100, 100); // 9 total steps
  };

  const getStepOrder = (stepId: string) => {
    const stepMap: Record<string, number> = {
      'UPLOAD': 1,
      'METADATA_EXTRACTION': 2,
      'KEYWORD_ENHANCEMENT': 3,
      'DATABASE_SEARCH': 4,
      'MANUAL_SEARCH': 5,
      'VALIDATION': 6,
      'RECOMMENDATIONS': 7,
      'SHORTLIST': 8,
      'EXPORT': 9,
    };
    return stepMap[stepId] || 1;
  };

  if (isLoading) {
    return <ProcessDashboardSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load processes. Please try again.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My Processes</h2>
          <p className="text-muted-foreground">
            Manage your manuscript analysis processes
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Process
        </Button>
      </div>

      {/* Process Grid */}
      {processes && processes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {processes.map((process) => (
            <Card key={process.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{process.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {process.description}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(process.status)}>
                    {process.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Step {getStepOrder(process.currentStep)} of 9</span>
                    <span>{Math.round(getStepProgress(process.currentStep))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getStepProgress(process.currentStep)}%` }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center text-sm text-muted-foreground space-x-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(process.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(process.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSelectProcess?.(process)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingProcess(process)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Process</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{process.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProcess(process.id, process.title)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No processes yet</h3>
              <p className="mb-4">Create your first manuscript analysis process to get started.</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Process
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateProcessDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
      
      {editingProcess && (
        <EditProcessDialog 
          process={editingProcess}
          open={!!editingProcess} 
          onOpenChange={(open) => !open && setEditingProcess(null)}
        />
      )}
    </div>
  );
};