/**
 * Shortlist Card Component
 * Displays individual shortlist information with actions
 */

import React from 'react';
import { Edit, Download, Trash2, Users, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { Shortlist } from '../../types/api';

interface ShortlistCardProps {
  shortlist: Shortlist;
  onEdit: (shortlist: Shortlist) => void;
  onExport: (shortlist: Shortlist) => void;
  onDelete: (shortlist: Shortlist) => void;
  isDeleting?: boolean;
}

export const ShortlistCard: React.FC<ShortlistCardProps> = ({
  shortlist,
  onEdit,
  onExport,
  onDelete,
  isDeleting = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUpdated = shortlist.updatedAt !== shortlist.createdAt;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{shortlist.name}</CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {formatDate(shortlist.createdAt)}
              </span>
              {isUpdated && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Calendar className="h-3 w-3" />
                  Updated {formatDate(shortlist.updatedAt)}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-1 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(shortlist)}
              className="h-8 w-8 p-0"
              title="Edit shortlist"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExport(shortlist)}
              className="h-8 w-8 p-0"
              title="Export shortlist"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(shortlist)}
              disabled={isDeleting}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete shortlist"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {shortlist.selectedReviewers.length} reviewers
            </Badge>
            {shortlist.selectedReviewers.length > 0 && (
              <span className="text-sm text-green-600 font-medium">
                Ready for export
              </span>
            )}
          </div>
          {shortlist.selectedReviewers.length === 0 && (
            <span className="text-sm text-gray-500">
              No reviewers selected
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};