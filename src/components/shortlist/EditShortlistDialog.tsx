/**
 * Edit Shortlist Dialog Component
 * Provides UI for editing existing reviewer shortlists
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { useUpdateShortlist } from '../../hooks/useShortlists';
import { useToast } from '../../hooks/use-toast';
import type { Shortlist, UpdateShortlistRequest } from '../../types/api';

interface EditShortlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  shortlist: Shortlist;
  availableReviewers: Array<{ id: string; name: string; email?: string }>;
}

export const EditShortlistDialog: React.FC<EditShortlistDialogProps> = ({
  open,
  onOpenChange,
  processId,
  shortlist,
  availableReviewers
}) => {
  const [formData, setFormData] = useState<UpdateShortlistRequest>({
    name: shortlist.name,
    selectedReviewers: [...shortlist.selectedReviewers]
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();
  const updateShortlistMutation = useUpdateShortlist();

  // Update form data when shortlist changes
  useEffect(() => {
    setFormData({
      name: shortlist.name,
      selectedReviewers: [...shortlist.selectedReviewers]
    });
  }, [shortlist]);

  const filteredReviewers = availableReviewers.filter(reviewer =>
    reviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reviewer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a shortlist name',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.selectedReviewers || formData.selectedReviewers.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one reviewer',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateShortlistMutation.mutateAsync({
        processId,
        shortlistId: shortlist.id,
        data: formData
      });

      toast({
        title: 'Success',
        description: 'Shortlist updated successfully',
        variant: 'default'
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update shortlist',
        variant: 'destructive'
      });
    }
  };

  const handleReviewerToggle = (reviewerId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedReviewers: checked
        ? [...(prev.selectedReviewers || []), reviewerId]
        : (prev.selectedReviewers || []).filter(id => id !== reviewerId)
    }));
  };

  const handleSelectAll = () => {
    const allReviewerIds = filteredReviewers.map(r => r.id);
    setFormData(prev => ({
      ...prev,
      selectedReviewers: allReviewerIds
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      selectedReviewers: []
    }));
  };

  const handleClose = () => {
    // Reset to original values
    setFormData({
      name: shortlist.name,
      selectedReviewers: [...shortlist.selectedReviewers]
    });
    setSearchTerm('');
    onOpenChange(false);
  };

  const hasChanges = 
    formData.name !== shortlist.name ||
    JSON.stringify(formData.selectedReviewers?.sort()) !== JSON.stringify(shortlist.selectedReviewers.sort());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Shortlist</DialogTitle>
          <DialogDescription>
            Update the name and reviewer selection for this shortlist.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shortlist-name">Shortlist Name</Label>
            <Input
              id="shortlist-name"
              placeholder="e.g., Primary Reviewers, Backup Options"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Select Reviewers ({formData.selectedReviewers?.length || 0} selected)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredReviewers.length === 0}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={!formData.selectedReviewers || formData.selectedReviewers.length === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <Input
              placeholder="Search reviewers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <ScrollArea className="h-64 border rounded-md p-4">
              {filteredReviewers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {availableReviewers.length === 0 
                    ? 'No reviewers available'
                    : 'No reviewers match your search'
                  }
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReviewers.map((reviewer) => (
                    <div key={reviewer.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`reviewer-${reviewer.id}`}
                        checked={formData.selectedReviewers?.includes(reviewer.id) || false}
                        onCheckedChange={(checked) => 
                          handleReviewerToggle(reviewer.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <Label 
                          htmlFor={`reviewer-${reviewer.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {reviewer.name}
                        </Label>
                        {reviewer.email && (
                          <p className="text-xs text-gray-500 truncate">
                            {reviewer.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateShortlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updateShortlistMutation.isPending || 
                !formData.name?.trim() || 
                !formData.selectedReviewers || 
                formData.selectedReviewers.length === 0 ||
                !hasChanges
              }
            >
              {updateShortlistMutation.isPending ? 'Updating...' : 'Update Shortlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};