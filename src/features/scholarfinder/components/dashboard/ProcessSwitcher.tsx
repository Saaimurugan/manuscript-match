/**
 * ProcessSwitcher Component
 * Allows switching between processes while preserving state
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronDown, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useProcessList, 
  useProcess,
  useCreateProcess 
} from '../../hooks/useProcessManagement';
import { ProcessStatus, ProcessStep, type Process } from '../../types/process';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProcessSwitcherProps {
  currentProcessId?: string;
  onProcessChange?: (processId: string) => void;
  showBackButton?: boolean;
  className?: string;
}

const ProcessSwitcher: React.FC<ProcessSwitcherProps> = ({
  currentProcessId,
  onProcessChange,
  showBackButton = false,
  className
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: processes = [], isLoading } = useProcessList();
  const { data: currentProcess } = useProcess(currentProcessId || '', !!currentProcessId);
  const createProcess = useCreateProcess();

  // Filter processes based on search term
  const filteredProcesses = processes.filter(process =>
    process.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    process.metadata.manuscriptTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group processes by status
  const groupedProcesses = {
    active: filteredProcesses.filter(p => 
      p.status === ProcessStatus.IN_PROGRESS || p.status === ProcessStatus.CREATED
    ),
    completed: filteredProcesses.filter(p => p.status === ProcessStatus.COMPLETED),
    other: filteredProcesses.filter(p => 
      p.status === ProcessStatus.FAILED || p.status === ProcessStatus.CANCELLED
    )
  };

  const getStatusIcon = (status: ProcessStatus) => {
    switch (status) {
      case ProcessStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case ProcessStatus.IN_PROGRESS:
      case ProcessStatus.CREATED:
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const formatStepName = (step: ProcessStep): string => {
    return step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ');
  };

  const handleProcessSelect = (processId: string) => {
    setOpen(false);
    setSearchTerm('');
    
    if (onProcessChange) {
      onProcessChange(processId);
    } else {
      navigate(`/scholarfinder/process/${processId}`);
    }
  };

  const handleCreateNew = async () => {
    if (!user) {
      toast.error('Please log in to create a new process');
      return;
    }

    try {
      const newProcess = await createProcess.mutateAsync({
        title: `New Analysis ${new Date().toLocaleDateString()}`,
        jobId: '',
        userId: user.id,
      });

      setOpen(false);
      handleProcessSelect(newProcess.id);
    } catch (error) {
      console.error('Failed to create process:', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/scholarfinder');
  };

  if (isLoading && !currentProcess) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDashboard}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Button>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-64 justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              {currentProcess ? (
                <>
                  {getStatusIcon(currentProcess.status)}
                  <span className="truncate">{currentProcess.title}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Select process...</span>
                </>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search processes..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="border-0 focus:ring-0"
              />
            </div>
            
            <CommandList className="max-h-80">
              <CommandEmpty>
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No processes found</p>
                </div>
              </CommandEmpty>
              
              {/* Create New Process */}
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="flex items-center gap-2 cursor-pointer"
                  disabled={createProcess.isPending}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Process</span>
                  {createProcess.isPending && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  )}
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Active Processes */}
              {groupedProcesses.active.length > 0 && (
                <CommandGroup heading="Active Processes">
                  {groupedProcesses.active.map((process) => (
                    <CommandItem
                      key={process.id}
                      onSelect={() => handleProcessSelect(process.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(process.status)}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{process.title}</div>
                          <div className="text-xs text-gray-500">
                            {formatStepName(process.currentStep)}
                          </div>
                        </div>
                      </div>
                      
                      {currentProcessId === process.id && (
                        <Badge variant="secondary" className="ml-2">
                          Current
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Completed Processes */}
              {groupedProcesses.completed.length > 0 && (
                <CommandGroup heading="Completed Processes">
                  {groupedProcesses.completed.slice(0, 5).map((process) => (
                    <CommandItem
                      key={process.id}
                      onSelect={() => handleProcessSelect(process.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(process.status)}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{process.title}</div>
                          <div className="text-xs text-gray-500">
                            Completed {new Date(process.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      {currentProcessId === process.id && (
                        <Badge variant="secondary" className="ml-2">
                          Current
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                  
                  {groupedProcesses.completed.length > 5 && (
                    <CommandItem
                      onSelect={handleBackToDashboard}
                      className="text-center text-sm text-gray-500 cursor-pointer"
                    >
                      View all completed processes...
                    </CommandItem>
                  )}
                </CommandGroup>
              )}

              {/* Other Processes (Failed/Cancelled) */}
              {groupedProcesses.other.length > 0 && (
                <CommandGroup heading="Other Processes">
                  {groupedProcesses.other.slice(0, 3).map((process) => (
                    <CommandItem
                      key={process.id}
                      onSelect={() => handleProcessSelect(process.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(process.status)}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{process.title}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {process.status.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      {currentProcessId === process.id && (
                        <Badge variant="secondary" className="ml-2">
                          Current
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Current Process Info */}
      {currentProcess && (
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
          <Separator orientation="vertical" className="h-6" />
          <Badge variant="outline">
            {formatStepName(currentProcess.currentStep)}
          </Badge>
          {currentProcess.metadata.totalReviewers && (
            <span>{currentProcess.metadata.totalReviewers} reviewers</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessSwitcher;