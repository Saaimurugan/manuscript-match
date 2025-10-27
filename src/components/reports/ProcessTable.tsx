import React, { useState } from 'react';
import { Process, AdminProcess } from '../../types/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Search, ArrowUpDown } from 'lucide-react';

interface ProcessTableProps {
  processes: (Process | AdminProcess)[];
  isAdmin: boolean;
}

type SortField = 'title' | 'status' | 'currentStep' | 'createdAt' | 'updatedAt' | 'userEmail';
type SortOrder = 'asc' | 'desc';

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  UPLOADING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SEARCHING: 'bg-purple-100 text-purple-800',
  VALIDATING: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  CREATED: 'Created',
  UPLOADING: 'Uploading',
  PROCESSING: 'Processing',
  SEARCHING: 'Searching',
  VALIDATING: 'Validating',
  COMPLETED: 'Completed',
  ERROR: 'Error',
};

const stepLabels: Record<string, string> = {
  UPLOAD: 'Upload & Extract',
  METADATA_EXTRACTION: 'Metadata Extraction',
  KEYWORD_ENHANCEMENT: 'Keyword Enhancement',
  DATABASE_SEARCH: 'Database Search',
  MANUAL_SEARCH: 'Manual Search',
  VALIDATION: 'Validation',
  RECOMMENDATIONS: 'Recommendations',
  SHORTLIST: 'Shortlist',
  EXPORT: 'Export',
};

export function ProcessTable({ processes, isAdmin }: ProcessTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedProcesses = React.useMemo(() => {
    let filtered = processes;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(p => {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(searchLower);
        const matchesStatus = p.status.toLowerCase().includes(searchLower);
        const matchesStep = p.currentStep.toLowerCase().includes(searchLower) ||
          (stepLabels[p.currentStep] || '').toLowerCase().includes(searchLower);
        const matchesUser = isAdmin && 'userEmail' in p 
          ? p.userEmail.toLowerCase().includes(searchLower)
          : false;
        
        return matchesTitle || matchesStatus || matchesStep || matchesUser;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'currentStep':
          aValue = a.currentStep;
          bValue = b.currentStep;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'userEmail':
          if (isAdmin && 'userEmail' in a && 'userEmail' in b) {
            aValue = a.userEmail.toLowerCase();
            bValue = b.userEmail.toLowerCase();
          } else {
            return 0;
          }
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [processes, searchTerm, sortField, sortOrder, isAdmin]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search processes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('title')}
                  className="h-8 px-2"
                >
                  Title
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('currentStep')}
                  className="h-8 px-2"
                >
                  Stage
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="h-8 px-2"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              {isAdmin && (
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('userEmail')}
                    className="h-8 px-2"
                  >
                    User
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
              )}
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('createdAt')}
                  className="h-8 px-2"
                >
                  Created
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('updatedAt')}
                  className="h-8 px-2"
                >
                  Updated
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProcesses.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={isAdmin ? 6 : 5} 
                  className="text-center text-muted-foreground"
                >
                  No processes found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProcesses.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-[300px] truncate" title={process.title}>
                      {process.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {stepLabels[process.currentStep] || process.currentStep}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={statusColors[process.status] || ''}
                    >
                      {statusLabels[process.status] || process.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && 'userEmail' in process && (
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={process.userEmail}>
                        {process.userEmail}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(process.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(process.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedProcesses.length} of {processes.length} processes
      </div>
    </div>
  );
}
