/**
 * Process Dashboard Component
 * Displays list of user processes with creation and management capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Calendar, Clock, Trash2, Edit, Search, Filter, ArrowUpDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [stageFilters, setStageFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'updatedAt' | 'status' | 'currentStep' | 'progress'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // 3x3 grid
  const { toast } = useToast();

  const { data: processes, isLoading, error } = useProcesses();

  // Add debugging and safety checks
  useEffect(() => {
    console.log('ProcessDashboard - processes data:', processes);
    console.log('ProcessDashboard - isLoading:', isLoading);
    console.log('ProcessDashboard - error:', error);
    
    // Check authentication status
    const token = localStorage.getItem('scholarfinder_token');
    console.log('ProcessDashboard - auth token present:', !!token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('ProcessDashboard - token payload:', payload);
        console.log('ProcessDashboard - token expired:', payload.exp * 1000 < Date.now());
      } catch (e) {
        console.log('ProcessDashboard - invalid token format');
      }
    }
  }, [processes, isLoading, error]);

  // Ensure processes is always an array
  const safeProcesses = Array.isArray(processes) ? processes : [];
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

  // Filter and sort processes - MUST be before early returns (Rules of Hooks)
  const filteredAndSortedProcesses = useMemo(() => {
    let filtered = safeProcesses;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(process => {
        const matchesTitle = process.title?.toLowerCase().includes(searchLower);
        const matchesDescription = process.description?.toLowerCase().includes(searchLower);
        const matchesStatus = process.status?.toLowerCase().includes(searchLower);
        return matchesTitle || matchesDescription || matchesStatus;
      });
    }

    // Apply status filters (multiselect)
    if (statusFilters.length > 0) {
      filtered = filtered.filter(process => statusFilters.includes(process.status));
    }

    // Apply stage filters (multiselect)
    if (stageFilters.length > 0) {
      filtered = filtered.filter(process => stageFilters.includes(process.currentStep));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'currentStep':
          aValue = getStepOrder(a.currentStep || 'UPLOAD');
          bValue = getStepOrder(b.currentStep || 'UPLOAD');
          break;
        case 'progress':
          aValue = getStepProgress(a.currentStep || 'UPLOAD');
          bValue = getStepProgress(b.currentStep || 'UPLOAD');
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || 0).getTime();
          bValue = new Date(b.updatedAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [safeProcesses, searchTerm, statusFilters, stageFilters, sortBy, sortOrder]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilters.length > 0 || stageFilters.length > 0;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilters([]);
    setStageFilters([]);
    setCurrentPage(1); // Reset to first page
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilters, stageFilters, sortBy, sortOrder]);

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Toggle stage filter
  const toggleStageFilter = (stage: string) => {
    setStageFilters(prev => 
      prev.includes(stage) 
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedProcesses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProcesses = filteredAndSortedProcesses.slice(startIndex, endIndex);

  // Auto-adjust page if current page is now empty (e.g., after deleting last item on page)
  useEffect(() => {
    if (filteredAndSortedProcesses.length > 0 && paginatedProcesses.length === 0 && currentPage > 1) {
      // Current page is empty but there are processes, go to previous page
      setCurrentPage(currentPage - 1);
    }
  }, [filteredAndSortedProcesses.length, paginatedProcesses.length, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Helper functions (non-hooks, can be anywhere)
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

  const getStepProgress = (currentStep: string) => {
    const stepOrder = getStepOrder(currentStep);
    return Math.min((stepOrder / 9) * 100, 100); // 9 total steps
  };

  const getStageLabel = (stepId: string) => {
    const stageLabels: Record<string, string> = {
      'UPLOAD': 'Upload & Extract',
      'METADATA_EXTRACTION': 'Metadata Extraction',
      'KEYWORD_ENHANCEMENT': 'Keyword Enhancement',
      'DATABASE_SEARCH': 'Database Search',
      'MANUAL_SEARCH': 'Manual Search',
      'VALIDATION': 'Validation',
      'RECOMMENDATIONS': 'Recommendations',
      'SHORTLIST': 'Shortlist',
      'EXPORT': 'Export',
    };
    return stageLabels[stepId] || stepId;
  };

  const getStatusColor = (status: Process['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PROCESSING':
      case 'SEARCHING':
      case 'VALIDATING':
      case 'UPLOADING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CREATED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Early returns AFTER all hooks
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
      <div className="flex flex-col gap-4">
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

        {/* Search and Filters - Single Line */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search processes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter - Multiselect */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start">
                  <Filter className="w-4 h-4 mr-2" />
                  Status
                  {statusFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {statusFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-3" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select Statuses</div>
                  {['CREATED', 'UPLOADING', 'PROCESSING', 'SEARCHING', 'VALIDATING', 'COMPLETED', 'ERROR'].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={statusFilters.includes(status)}
                        onCheckedChange={() => toggleStatusFilter(status)}
                      />
                      <label
                        htmlFor={`status-${status}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Stage Filter - Multiselect */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start">
                  <Filter className="w-4 h-4 mr-2" />
                  Stage
                  {stageFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {stageFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-3" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select Stages</div>
                  {[
                    { value: 'UPLOAD', label: 'Upload & Extract' },
                    { value: 'METADATA_EXTRACTION', label: 'Metadata Extraction' },
                    { value: 'KEYWORD_ENHANCEMENT', label: 'Keyword Enhancement' },
                    { value: 'DATABASE_SEARCH', label: 'Database Search' },
                    { value: 'MANUAL_SEARCH', label: 'Manual Search' },
                    { value: 'VALIDATION', label: 'Validation' },
                    { value: 'RECOMMENDATIONS', label: 'Recommendations' },
                    { value: 'SHORTLIST', label: 'Shortlist' },
                    { value: 'EXPORT', label: 'Export' },
                  ].map((stage) => (
                    <div key={stage.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stage-${stage.value}`}
                        checked={stageFilters.includes(stage.value)}
                        onCheckedChange={() => toggleStageFilter(stage.value)}
                      />
                      <label
                        htmlFor={`stage-${stage.value}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {stage.label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="currentStep">Workflow Stage</SelectItem>
                <SelectItem value="progress">Progress (%)</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="gap-1 px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1 px-3"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Search: {searchTerm}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setSearchTerm('')}
                  />
                </Badge>
              )}
              {statusFilters.map((status) => (
                <Badge key={status} variant="secondary" className="gap-1 text-xs">
                  {status}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => toggleStatusFilter(status)}
                  />
                </Badge>
              ))}
              {stageFilters.map((stage) => (
                <Badge key={stage} variant="secondary" className="gap-1 text-xs">
                  {stage.replace(/_/g, ' ')}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => toggleStageFilter(stage)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Results count and pagination info */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedProcesses.length)} of {filteredAndSortedProcesses.length} processes
              {filteredAndSortedProcesses.length !== safeProcesses.length && ` (filtered from ${safeProcesses.length})`}
            </p>
            
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="9">9</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="18">18</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Process Grid */}
      {paginatedProcesses && paginatedProcesses.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedProcesses
            .filter(process => {
              // More comprehensive validation
              if (!process) {
                console.warn('Filtered out null/undefined process');
                return false;
              }
              if (!process.id) {
                console.warn('Filtered out process without id:', process);
                return false;
              }
              if (!process.title) {
                console.warn('Filtered out process without title:', process);
                return false;
              }
              return true;
            })
            .map((process, index) => (
            <Card key={process.id || `process-${index}`} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{process.title || 'Untitled Process'}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {process.description || 'No description available'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(process.status || 'CREATED')}>
                    {(process.status || 'CREATED').replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Current Stage */}
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-normal">
                    {getStageLabel(process.currentStep || 'UPLOAD')}
                  </Badge>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Step {getStepOrder(process.currentStep || 'UPLOAD')} of 9</span>
                    <span>{Math.round(getStepProgress(process.currentStep || 'UPLOAD'))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getStepProgress(process.currentStep || 'UPLOAD')}%` }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center text-sm text-muted-foreground space-x-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {process.createdAt ? new Date(process.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {process.updatedAt ? new Date(process.updatedAt).toLocaleDateString() : 'Unknown'}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  const showEllipsis = 
                    (page === currentPage - 2 && currentPage > 3) ||
                    (page === currentPage + 2 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return <span key={page} className="px-2">...</span>;
                  }

                  if (!showPage) {
                    return null;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <span className="text-sm text-muted-foreground ml-2">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
        </>
      ) : hasActiveFilters ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No processes found</h3>
              <p className="mb-4">No processes match your current filters</p>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
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