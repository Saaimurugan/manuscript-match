/**
 * DatabaseSelector Component
 * Allows users to select which academic databases to search
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Database, Globe, BookOpen, Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatabaseInfo {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  estimatedResults: 'Low' | 'Medium' | 'High';
}

interface DatabaseSelectorProps {
  databases: DatabaseInfo[];
  selectedDatabases: string[];
  onSelectionChange: (selectedDatabases: string[]) => void;
  isLoading?: boolean;
}

const getDatabaseIcon = (databaseId: string) => {
  switch (databaseId) {
    case 'pubmed':
      return <Microscope className="h-5 w-5 text-green-600" />;
    case 'tandf':
      return <BookOpen className="h-5 w-5 text-blue-600" />;
    case 'sciencedirect':
      return <Globe className="h-5 w-5 text-orange-600" />;
    case 'wiley':
      return <Database className="h-5 w-5 text-purple-600" />;
    default:
      return <Database className="h-5 w-5 text-gray-600" />;
  }
};

const getEstimatedResultsBadge = (level: string) => {
  const variants = {
    'Low': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Medium': 'bg-blue-100 text-blue-800 border-blue-200',
    'High': 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs", variants[level as keyof typeof variants])}
    >
      {level} Volume
    </Badge>
  );
};

export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  databases,
  selectedDatabases,
  onSelectionChange,
  isLoading = false
}) => {
  const handleDatabaseToggle = (databaseId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedDatabases, databaseId]);
    } else {
      onSelectionChange(selectedDatabases.filter(id => id !== databaseId));
    }
  };

  const handleSelectAll = () => {
    if (selectedDatabases.length === databases.length) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all
      onSelectionChange(databases.map(db => db.id));
    }
  };

  const allSelected = selectedDatabases.length === databases.length;
  const someSelected = selectedDatabases.length > 0 && selectedDatabases.length < databases.length;

  return (
    <div className="space-y-4">
      {/* Select All Control */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            disabled={isLoading}
            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
          />
          <label 
            htmlFor="select-all" 
            className="text-sm font-medium cursor-pointer"
          >
            {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All Databases'}
          </label>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedDatabases.length} of {databases.length} selected
        </div>
      </div>

      {/* Database List */}
      <div className="grid gap-3">
        {databases.map((database) => {
          const isSelected = selectedDatabases.includes(database.id);
          
          return (
            <Card 
              key={database.id}
              className={cn(
                "transition-all duration-200 cursor-pointer hover:shadow-md",
                isSelected && "ring-2 ring-primary/20 bg-primary/5",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !isLoading && handleDatabaseToggle(database.id, !isSelected)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Checkbox */}
                  <Checkbox
                    id={database.id}
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      !isLoading && handleDatabaseToggle(database.id, checked as boolean)
                    }
                    disabled={isLoading}
                    className="mt-1"
                  />
                  
                  {/* Database Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getDatabaseIcon(database.id)}
                  </div>
                  
                  {/* Database Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <label 
                        htmlFor={database.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {database.name}
                      </label>
                      <div className="flex items-center space-x-2">
                        {database.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                        {getEstimatedResultsBadge(database.estimatedResults)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {database.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedDatabases.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800">
            <Database className="h-4 w-4" />
            <span className="text-sm font-medium">
              {selectedDatabases.length} database{selectedDatabases.length !== 1 ? 's' : ''} selected for search
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            The search will be executed across all selected databases simultaneously.
          </p>
        </div>
      )}

      {/* No Selection Warning */}
      {selectedDatabases.length === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 text-yellow-800">
            <Database className="h-4 w-4" />
            <span className="text-sm font-medium">
              No databases selected
            </span>
          </div>
          <p className="text-xs text-yellow-600 mt-1">
            Please select at least one database to perform the search.
          </p>
        </div>
      )}
    </div>
  );
};

export default DatabaseSelector;