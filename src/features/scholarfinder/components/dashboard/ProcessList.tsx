/**
 * ProcessList Component
 * Displays a list of processes with status and progress indicators
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Play, 
  Trash2, 
  Copy, 
  Download, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useDeleteProcess, 
  useDuplicateProcess,
  useProcessStatusOperations 
} from '../../hooks/useProcessManagement';
import { ProcessStatus, ProcessStep, type Process } from '../../types/process';
import { toast } from 'sonner';

interface ProcessListProps {
  processes: Process[];
  isLoading: boolean;
  onProcessSelect: (processId: string) => void;
  className?: string;
}

const ProcessList: React.FC<ProcessListProps> = ({
  processes,
  isLoading,
  onProcessSelect,
  className
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);
  
  const deleteProcess = useDeleteProcess();
  const duplicateProcess = useDuplicateProcess();
  const { cancelProcess } = useProcessStatusOperations();

  const getStepProgress = (currentStep: ProcessStep): number => {
    const stepOrder = [
      ProcessStep.UPLOAD,
      ProcessStep.METADATA,
      ProcessStep.KEYWORDS,
      ProcessStep.SEARCH,
      ProcessStep.MANUAL,
      ProcessStep.VALIDATION,
      ProcessStep.RECOMMENDATIONS,
      ProcessStep.SHORTLIST,
      ProcessStep.EXPORT
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    return ((currentIndex + 1) / stepOrder.length) * 100;
  };

  const getStatusIcon = (status: ProcessStatus) => {
    switch (status) {
      case ProcessStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case ProcessStatus.IN_PROGRESS:
        return <Clock className="w-4 h-4 text-blue-600" />;
      case ProcessStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case ProcessStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: ProcessStatus) => {
    switch (status) {
      case ProcessStatus.COMPLETED:
        return 'default';
      case ProcessStatus.IN_PROGRESS:
        return 'secondary';
      case ProcessStatus.FAILED:
        return 'destructive';
      case ProcessStatus.CANCELLED:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStepName = (step: ProcessStep): string => {
    return step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ');
  };

  const handleDeleteClick = (process: Process) => {
    setProcessToDelete(process);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!processToDelete) return;
    
    try {
      await deleteProcess.mutateAsync(processToDelete.id);
      setDeleteDialogOpen(false);
      setProcessToDelete(null);
    } catch (error) {
      console.error('Failed to delete process:', error);
    }
  };

  const handleDuplicate = async (process: Process) => {
    try {
      const newTitle = `${process.title} (Copy)`;
      await duplicateProcess.mutateAsync({
        processId: process.id,
        newTitle
      });
    } catch (error) {
      console.error('Failed to duplicate process:', error);
    }
  };

  const handleCancel = async (process: Process) => {
    try {
      await cancelProcess.mutateAsync(process.id);
      toast.success('Process cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel process:', error);
    }
  };

  const handleExport = (process: Process) => {
    // Navigate to export step
    navigate(`/scholarfinder/process/${process.id}?step=export`);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No processes found</h3>
        <p className="text-gray-600 mb-4">
          Start by creating a new manuscript analysis process.
        </p>
        <Button onClick={() => navigate('/scholarfinder/new')}>
          Create New Process
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {processes.map((process) => (
          <Card 
            key={process.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onProcessSelect(process.id)}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(process.status)}
                      <h3 className="font-semibold text-lg">{process.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(process.updatedAt).toLocaleDateString()}
                      </div>
                      
                      {process.metadata.totalReviewers && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {process.metadata.totalReviewers} reviewers
                        </div>
                      )}
                      
                      {process.metadata.shortlistCount && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {process.metadata.shortlistCount} shortlisted
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(process.status)}>
                      {process.status}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onProcessSelect(process.id);
                        }}>
                          <Play className="w-4 h-4 mr-2" />
                          Open Process
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(process);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        
                        {process.status === ProcessStatus.COMPLETED && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleExport(process);
                          }}>
                            <Download className="w-4 h-4 mr-2" />
                            Export Results
                          </DropdownMenuItem>
                        )}
                        
                        {process.status === ProcessStatus.IN_PROGRESS && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(process);
                          }}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Process
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(process);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Current Step: <span className="font-medium">{formatStepName(process.currentStep)}</span>
                    </span>
                    <span className="text-gray-600">
                      {Math.round(getStepProgress(process.currentStep))}% Complete
                    </span>
                  </div>
                  
                  <Progress 
                    value={getStepProgress(process.currentStep)} 
                    className="h-2"
                  />
                </div>

                {/* Metadata */}
                {process.metadata.manuscriptTitle && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Manuscript:</span> {process.metadata.manuscriptTitle}
                  </div>
                )}

                {/* Error indicator */}
                {process.status === ProcessStatus.FAILED && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Process failed - click to view details</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Process</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{processToDelete?.title}"? 
              This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteProcess.isPending}
            >
              {deleteProcess.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProcessList;