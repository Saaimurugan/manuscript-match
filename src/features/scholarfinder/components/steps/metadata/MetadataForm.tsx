/**
 * MetadataForm Component
 * Form for editing basic manuscript metadata (title, abstract, keywords)
 */

import React, { useState } from 'react';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Textarea } from '../../../../../components/ui/textarea';
import { Label } from '../../../../../components/ui/label';
import { Badge } from '../../../../../components/ui/badge';
import { X, Plus } from 'lucide-react';
import type { MetadataFormData } from '../MetadataStep';

interface MetadataFormProps {
  form: UseFormReturn<MetadataFormData>;
  errors: FieldErrors<MetadataFormData>;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({ form, errors }) => {
  const [newKeyword, setNewKeyword] = useState('');
  
  const { register, watch, setValue, getValues } = form;
  const keywords = watch('keywords') || [];

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim();
    if (keyword && !keywords.includes(keyword)) {
      const updatedKeywords = [...keywords, keyword];
      setValue('keywords', updatedKeywords, { shouldDirty: true, shouldValidate: true });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    const updatedKeywords = keywords.filter((_, index) => index !== indexToRemove);
    setValue('keywords', updatedKeywords, { shouldDirty: true, shouldValidate: true });
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Manuscript Title *
        </Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Enter the manuscript title"
          className={errors.title ? 'border-red-500 focus:border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The main title of your manuscript as it should appear in publications
        </p>
      </div>

      {/* Abstract Field */}
      <div className="space-y-2">
        <Label htmlFor="abstract" className="text-sm font-medium">
          Abstract *
        </Label>
        <Textarea
          id="abstract"
          {...register('abstract')}
          placeholder="Enter the manuscript abstract"
          rows={8}
          className={`resize-none ${errors.abstract ? 'border-red-500 focus:border-red-500' : ''}`}
        />
        {errors.abstract && (
          <p className="text-sm text-red-600">{errors.abstract.message}</p>
        )}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>A concise summary of your research objectives, methods, results, and conclusions</span>
          <span>{watch('abstract')?.length || 0} characters</span>
        </div>
      </div>

      {/* Keywords Field */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Keywords *
        </Label>
        
        {/* Add Keyword Input */}
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeywordKeyPress}
            placeholder="Add a keyword"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddKeyword}
            disabled={!newKeyword.trim() || keywords.includes(newKeyword.trim())}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Keywords Display */}
        {keywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <span>{keyword}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(index)}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove keyword: ${keyword}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} added
            </p>
          </div>
        )}

        {errors.keywords && (
          <p className="text-sm text-red-600">
            {Array.isArray(errors.keywords) 
              ? 'Please check keyword entries for errors'
              : errors.keywords.message
            }
          </p>
        )}
        
        <p className="text-xs text-muted-foreground">
          Add relevant keywords that describe your research topic, methods, and findings
        </p>
      </div>
    </div>
  );
};

export default MetadataForm;