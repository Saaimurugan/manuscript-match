/**
 * Shortlist Manager Component
 * Provides UI for creating, managing, and exporting reviewer shortlists
 */

import React, { useState } from 'react';
import { Plus, Download, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useShortlists, useDeleteShortlist, useExportShortlist } from '../../hooks/useShortlists';
import { useToast } from '../../hooks/use-toast';
import { CreateShortlistDialog } from './CreateShortlistDialog';
import { EditShortlistDialog } from './EditShortlistDialog';
import { ExportShortlistDialog } from './ExportShortlistDialog';
import type { Shortlist } from '../../types/api';

interface ShortlistManagerProps {
  processId: string;
  availableReviewers?: Array<{ id: string; name: string; email?: string }>;
}

export const ShortlistManager: React.FC<ShortlistManagerProps> = ({
  processId,
  availableReviewers = []
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingShortlist, setEditingShortlist] = useState<Shortlist | null>(null);
  const [exportingShortlist, setExportingShortlist] = useState<Shortlist | null>(null);
  
  const { toast } = useToast();
  const { data: shortlists, isLoading, error } = useShortlists(processId);
  const deleteShortlistMutation = useDeleteShortlist();
  const exportShortlistMutation = useExportShortlist();

  const handleDeleteShortlist = async (shortlist: Shortlist) => {
    if (!confirm(`Are you sure you want to delete "${shortlist.name}"?`)) {
      return;
    }

    try {
      await deleteShortlistMutation.mutateAsync({
        processId,
        shortlistId: shortlist.id
      });
      
      toast({
        title: 'Success',
        description: 'Shortlist deleted successfully',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete shortlist',
        variant: 'destructive'
      });
    }
  };

  const handleExportShortlist = (shortlist: Shortlist) => {
    setExportingShortlist(shortlist);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Reviewer Shortlists</h3>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Shortlist
          </Button>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load shortlists</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reviewer Shortlists</h3>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Shortlist
        </Button>
      </div>

      {shortlists && shortlists.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium mb-2">No shortlists created</h4>
            <p className="text-gray-600 mb-4">
              Create your first shortlist to organize and export reviewer recommendations.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Shortlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shortlists?.map((shortlist) => (
            <Card key={shortlist.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{shortlist.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(shortlist.createdAt).toLocaleDateString()}
                      {shortlist.updatedAt !== shortlist.createdAt && (
                        <span className="ml-2">
                          • Updated {new Date(shortlist.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingShortlist(shortlist)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportShortlist(shortlist)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteShortlist(shortlist)}
                      disabled={deleteShortlistMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {shortlist.selectedReviewers.length} reviewers
                  </Badge>
                  {shortlist.selectedReviewers.length > 0 && (
                    <span className="text-sm text-gray-600">
                      Ready for export
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateShortlistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        processId={processId}
        availableReviewers={availableReviewers}
      />

      {editingShortlist && (
        <EditShortlistDialog
          open={!!editingShortlist}
          onOpenChange={(open) => !open && setEditingShortlist(null)}
          processId={processId}
          shortlist={editingShortlist}
          availableReviewers={availableReviewers}
        />
      )}

      {exportingShortlist && (
        <ExportShortlistDialog
          open={!!exportingShortlist}
          onOpenChange={(open) => !open && setExportingShortlist(null)}
          processId={processId}
          shortlist={exportingShortlist}
        />
      )}
    </div>
  );
};