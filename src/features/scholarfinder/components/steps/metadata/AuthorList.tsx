/**
 * AuthorList Component
 * Manages author information and their affiliations with drag-and-drop reordering
 */

import React, { useState } from 'react';
import { FieldErrors } from 'react-hook-form';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Label } from '../../../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { Badge } from '../../../../../components/ui/badge';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  User, 
  Building, 
  Mail,
  AlertCircle
} from 'lucide-react';
import type { Author, Affiliation } from '../../../types/process';

interface AuthorListProps {
  authors: Author[];
  affiliations: Affiliation[];
  onAuthorsChange: (authors: Author[]) => void;
  onAffiliationsChange: (affiliations: Affiliation[]) => void;
  errors: {
    authors?: any;
    affiliations?: any;
  };
}

export const AuthorList: React.FC<AuthorListProps> = ({
  authors,
  affiliations,
  onAuthorsChange,
  onAffiliationsChange,
  errors
}) => {
  const [newAffiliation, setNewAffiliation] = useState({ name: '', country: '', city: '' });
  const [draggedAuthorIndex, setDraggedAuthorIndex] = useState<number | null>(null);

  // Author management functions
  const addAuthor = () => {
    const newAuthor: Author = {
      name: '',
      email: '',
      affiliation: affiliations[0]?.name || ''
    };
    onAuthorsChange([...authors, newAuthor]);
  };

  const updateAuthor = (index: number, field: keyof Author, value: string) => {
    const updatedAuthors = authors.map((author, i) => 
      i === index ? { ...author, [field]: value } : author
    );
    onAuthorsChange(updatedAuthors);
  };

  const removeAuthor = (index: number) => {
    const updatedAuthors = authors.filter((_, i) => i !== index);
    onAuthorsChange(updatedAuthors);
  };

  const moveAuthor = (fromIndex: number, toIndex: number) => {
    const updatedAuthors = [...authors];
    const [movedAuthor] = updatedAuthors.splice(fromIndex, 1);
    updatedAuthors.splice(toIndex, 0, movedAuthor);
    onAuthorsChange(updatedAuthors);
  };

  // Affiliation management functions
  const addAffiliation = () => {
    if (newAffiliation.name.trim()) {
      const affiliation: Affiliation = {
        name: newAffiliation.name.trim(),
        country: newAffiliation.country.trim() || undefined,
        city: newAffiliation.city.trim() || undefined
      };
      
      // Check if affiliation already exists
      const exists = affiliations.some(aff => 
        aff.name.toLowerCase() === affiliation.name.toLowerCase()
      );
      
      if (!exists) {
        onAffiliationsChange([...affiliations, affiliation]);
        setNewAffiliation({ name: '', country: '', city: '' });
      }
    }
  };

  const updateAffiliation = (index: number, field: keyof Affiliation, value: string) => {
    const updatedAffiliations = affiliations.map((aff, i) => 
      i === index ? { ...aff, [field]: value || undefined } : aff
    );
    onAffiliationsChange(updatedAffiliations);
  };

  const removeAffiliation = (index: number) => {
    const affiliationToRemove = affiliations[index];
    
    // Update authors who have this affiliation
    const updatedAuthors = authors.map(author => ({
      ...author,
      affiliation: author.affiliation === affiliationToRemove.name 
        ? (affiliations[0]?.name || '') 
        : author.affiliation
    }));
    
    const updatedAffiliations = affiliations.filter((_, i) => i !== index);
    
    onAuthorsChange(updatedAuthors);
    onAffiliationsChange(updatedAffiliations);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedAuthorIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedAuthorIndex !== null && draggedAuthorIndex !== dropIndex) {
      moveAuthor(draggedAuthorIndex, dropIndex);
    }
    setDraggedAuthorIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedAuthorIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Authors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Authors</h3>
            <p className="text-sm text-muted-foreground">
              List authors in the order they should appear in publications
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addAuthor}>
            <Plus className="h-4 w-4 mr-2" />
            Add Author
          </Button>
        </div>

        {authors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No authors added yet</p>
                <Button type="button" variant="outline" size="sm" onClick={addAuthor} className="mt-2">
                  Add First Author
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {authors.map((author, index) => (
              <Card
                key={index}
                className={`transition-all ${
                  draggedAuthorIndex === index ? 'opacity-50 scale-95' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex items-center mt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <Badge variant="outline" className="ml-2 text-xs">
                        {index + 1}
                      </Badge>
                    </div>

                    {/* Author Fields */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Name */}
                      <div className="space-y-1">
                        <Label className="text-xs">Name *</Label>
                        <Input
                          value={author.name}
                          onChange={(e) => updateAuthor(index, 'name', e.target.value)}
                          placeholder="Author name"
                          className={
                            errors.authors?.[index]?.name ? 'border-red-500' : ''
                          }
                        />
                        {errors.authors?.[index]?.name && (
                          <p className="text-xs text-red-600">
                            {(errors.authors[index]?.name as any)?.message}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={author.email || ''}
                          onChange={(e) => updateAuthor(index, 'email', e.target.value)}
                          placeholder="author@email.com"
                          className={
                            errors.authors?.[index]?.email ? 'border-red-500' : ''
                          }
                        />
                        {errors.authors?.[index]?.email && (
                          <p className="text-xs text-red-600">
                            {(errors.authors[index]?.email as any)?.message}
                          </p>
                        )}
                      </div>

                      {/* Affiliation */}
                      <div className="space-y-1">
                        <Label className="text-xs">Affiliation *</Label>
                        <Select
                          value={author.affiliation}
                          onValueChange={(value) => updateAuthor(index, 'affiliation', value)}
                        >
                          <SelectTrigger className={
                            errors.authors?.[index]?.affiliation ? 'border-red-500' : ''
                          }>
                            <SelectValue placeholder="Select affiliation" />
                          </SelectTrigger>
                          <SelectContent>
                            {affiliations.map((aff, affIndex) => (
                              <SelectItem key={affIndex} value={aff.name}>
                                {aff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.authors?.[index]?.affiliation && (
                          <p className="text-xs text-red-600">
                            {(errors.authors[index]?.affiliation as any)?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAuthor(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {errors.authors && typeof errors.authors === 'object' && 'message' in errors.authors && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.authors.message}</span>
          </div>
        )}
      </div>

      {/* Affiliations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Affiliations</h3>
            <p className="text-sm text-muted-foreground">
              Manage institutional affiliations for authors
            </p>
          </div>
        </div>

        {/* Add New Affiliation */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Add New Affiliation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Input
                  value={newAffiliation.name}
                  onChange={(e) => setNewAffiliation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Institution name *"
                />
              </div>
              <div>
                <Input
                  value={newAffiliation.city}
                  onChange={(e) => setNewAffiliation(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAffiliation.country}
                  onChange={(e) => setNewAffiliation(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Country"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAffiliation}
                  disabled={!newAffiliation.name.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Affiliations */}
        {affiliations.length > 0 && (
          <div className="space-y-2">
            {affiliations.map((affiliation, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        value={affiliation.name}
                        onChange={(e) => updateAffiliation(index, 'name', e.target.value)}
                        placeholder="Institution name"
                        className={
                          errors.affiliations?.[index]?.name ? 'border-red-500' : ''
                        }
                      />
                      <Input
                        value={affiliation.city || ''}
                        onChange={(e) => updateAffiliation(index, 'city', e.target.value)}
                        placeholder="City"
                      />
                      <Input
                        value={affiliation.country || ''}
                        onChange={(e) => updateAffiliation(index, 'country', e.target.value)}
                        placeholder="Country"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAffiliation(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={affiliations.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {errors.affiliations?.[index]?.name && (
                    <p className="text-xs text-red-600 mt-1 ml-7">
                      {(errors.affiliations[index]?.name as any)?.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {errors.affiliations && typeof errors.affiliations === 'object' && 'message' in errors.affiliations && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.affiliations.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorList;