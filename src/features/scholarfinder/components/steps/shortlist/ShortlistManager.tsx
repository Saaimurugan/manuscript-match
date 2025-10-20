/**
 * ShortlistManager Component
 * Component for managing selected reviewers in the shortlist
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { 
  ListChecks, 
  Trash2, 
  GripVertical, 
  MoreVertical,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  History,
  Mail,
  Building,
  MapPin
} from 'lucide-react';
import { Reviewer } from '../../../types/api';
import { cn } from '@/lib/utils';

interface ShortlistManagerProps {
  selectedReviewers: Reviewer[];
  onRemoveFromShortlist: (reviewerId: string) => void;
  onBulkRemove: (reviewerIds: string[]) => void;
  onReorderShortlist: (fromIndex: number, toIndex: number) => void;
  selectionHistory: ShortlistAction[];
  isLoading?: boolean;
}

interface ShortlistAction {
  type: 'add' | 'remove' | 'reorder' | 'bulk_add' | 'bulk_remove' | 'clear';
  reviewerId?: string;
  reviewerIds?: string[];
  fromIndex?: number;
  toIndex?: number;
  timestamp: Date;
}

export const ShortlistManager: React.FC<ShortlistManagerProps> = ({
  selectedReviewers,
  onRemoveFromShortlist,
  onBulkRemove,
  onReorderShortlist,
  selectionHistory,
  isLoading = false
}) => {
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [reviewerToRemove, setReviewerToRemove] = useState<string | null>(null);
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleBulkSelectionToggle = useCallback((reviewerId: string) => {
    setBulkSelection(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(reviewerId)) {
        newSelection.delete(reviewerId);
      } else {
        newSelection.add(reviewerId);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = selectedReviewers.map(r => r.email);
    setBulkSelection(new Set(allIds));
  }, [selectedReviewers]);

  const handleDeselectAll = useCallback(() => {
    setBulkSelection(new Set());
  }, []);

  const handleRemoveClick = useCallback((reviewerId: string) => {
    setReviewerToRemove(reviewerId);
    setShowRemoveDialog(true);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (reviewerToRemove) {
      onRemoveFromShortlist(reviewerToRemove);
      setReviewerToRemove(null);
    }
    setShowRemoveDialog(false);
  }, [reviewerToRemove, onRemoveFromShortlist]);

  const handleBulkRemoveClick = useCallback(() => {
    if (bulkSelection.size > 0) {
      setShowBulkRemoveDialog(true);
    }
  }, [bulkSelection.size]);

  const handleConfirmBulkRemove = useCallback(() => {
    const reviewerIds = Array.from(bulkSelection);
    onBulkRemove(reviewerIds);
    setBulkSelection(new Set());
    setShowBulkRemoveDialog(false);
  }, [bulkSelection, onBulkRemove]);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      onReorderShortlist(index, index - 1);
    }
  }, [onReorderShortlist]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < selectedReviewers.length - 1) {
      onReorderShortlist(index, index + 1);
    }
  }, [selectedReviewers.length, onReorderShortlist]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderShortlist(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, onReorderShortlist]);

  const getConditionsMetBadge = (conditionsMet: number, conditionsSatisfied: string) => {
    const totalConditions = conditionsSatisfied.split(',').length;
    const percentage = totalConditions > 0 ? (conditionsMet / totalConditions) * 100 : 0;
    
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    if (percentage >= 80) variant = "default";
    else if (percentage >= 60) variant = "secondary";
    else variant = "outline";

    return (
      <Badge variant={variant} className="text-xs">
        {conditionsMet}/{totalConditions}
      </Badge>
    );
  };

  const formatActionDescription = (action: ShortlistAction) => {
    const timeAgo = new Date().getTime() - action.timestamp.getTime();
    const minutes = Math.floor(timeAgo / 60000);
    const timeStr = minutes < 1 ? 'Just now' : `${minutes}m ago`;

    switch (action.type) {
      case 'add':
        const addedReviewer = selectedReviewers.find(r => r.email === action.reviewerId);
        return `Added ${addedReviewer?.reviewer || 'reviewer'} - ${timeStr}`;
      case 'remove':
        return `Removed reviewer - ${timeStr}`;
      case 'bulk_add':
        return `Added ${action.reviewerIds?.length || 0} reviewers - ${timeStr}`;
      case 'bulk_remove':
        return `Removed ${action.reviewerIds?.length || 0} reviewers - ${timeStr}`;
      case 'reorder':
        const reorderedReviewer = selectedReviewers.find(r => r.email === action.reviewerId);
        return `Moved ${reorderedReviewer?.reviewer || 'reviewer'} - ${timeStr}`;
      case 'clear':
        return `Cleared all reviewers - ${timeStr}`;
      default:
        return `Unknown action - ${timeStr}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <ListChecks className="h-5 w-5" />
              <span>Your Shortlist</span>
            </CardTitle>
            <CardDescription>
              Manage your selected reviewers - reorder, remove, or view details
              ({selectedReviewers.length} reviewers selected)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            {bulkSelection.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemoveClick}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Selected ({bulkSelection.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selection History */}
        {showHistory && selectionHistory.length > 0 && (
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-3 flex items-center">
              <History className="h-4 w-4 mr-2" />
              Recent Actions
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectionHistory.slice(-5).reverse().map((action, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  {formatActionDescription(action)}
                </div>
              ))}
            </div>
          </Card>
        )}

        {selectedReviewers.length > 0 ? (
          <>
            {/* Bulk Selection Controls */}
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={bulkSelection.size === selectedReviewers.length ? handleDeselectAll : handleSelectAll}
                >
                  {bulkSelection.size === selectedReviewers.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span className="ml-2">
                    {bulkSelection.size === selectedReviewers.length ? 'Deselect All' : 'Select All'}
                  </span>
                </Button>
                {bulkSelection.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {bulkSelection.size} selected
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Drag rows to reorder • Click actions for more options
              </div>
            </div>

            {/* Shortlist Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={bulkSelection.size === selectedReviewers.length && selectedReviewers.length > 0}
                        onCheckedChange={bulkSelection.size === selectedReviewers.length ? handleDeselectAll : handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Affiliation & Location</TableHead>
                    <TableHead className="text-center">Publications</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReviewers.map((reviewer, index) => (
                    <TableRow 
                      key={reviewer.email} 
                      className={cn(
                        "hover:bg-muted/50 cursor-move",
                        draggedIndex === index && "opacity-50"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={bulkSelection.has(reviewer.email)}
                          onCheckedChange={() => handleBulkSelectionToggle(reviewer.email)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{reviewer.reviewer}</div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {reviewer.email}
                          </div>
                          {reviewer.coauthor && (
                            <Badge variant="outline" className="text-xs">
                              Co-author
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="max-w-xs truncate" title={reviewer.aff}>
                              {reviewer.aff}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {reviewer.city}, {reviewer.country}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <div className="font-medium">{reviewer.Total_Publications}</div>
                          <div className="text-xs text-muted-foreground">
                            {reviewer['Publications (last 5 years)']} (5yr)
                          </div>
                          {reviewer.Retracted_Pubs_no > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {reviewer.Retracted_Pubs_no} retracted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getConditionsMetBadge(reviewer.conditions_met, reviewer.conditions_satisfied)}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMoveDown(index)}
                              disabled={index === selectedReviewers.length - 1}
                            >
                              <ArrowDown className="h-4 w-4 mr-2" />
                              Move Down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveClick(reviewer.email)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No reviewers in shortlist</p>
            <p className="text-sm">
              Add reviewers from the available recommendations above
            </p>
          </div>
        )}
      </CardContent>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Reviewer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this reviewer from your shortlist? 
              This action can be undone using the undo function.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Remove Confirmation Dialog */}
      <AlertDialog open={showBulkRemoveDialog} onOpenChange={setShowBulkRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Multiple Reviewers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {bulkSelection.size} reviewers from your shortlist? 
              This action can be undone using the undo function.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkRemove}>
              Remove {bulkSelection.size} Reviewers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};