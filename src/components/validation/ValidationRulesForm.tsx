/**
 * Validation Rules Form Component
 * Form for configuring author validation rules
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ValidationRequest } from '@/types/api';

interface ValidationRulesFormProps {
  rules: ValidationRequest['rules'];
  onChange: (rules: ValidationRequest['rules']) => void;
  disabled?: boolean;
}

export const ValidationRulesForm: React.FC<ValidationRulesFormProps> = ({
  rules,
  onChange,
  disabled = false,
}) => {
  const updateRule = <K extends keyof ValidationRequest['rules']>(
    key: K,
    value: ValidationRequest['rules'][K]
  ) => {
    onChange({
      ...rules,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Validation Rules</h3>
        <p className="text-sm text-muted-foreground">
          Configure the rules to filter potential reviewers and avoid conflicts of interest.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These rules will be applied to all potential reviewers found during the search phase.
          More restrictive rules will result in fewer but more appropriate reviewer recommendations.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Conflict of Interest Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conflict of Interest</CardTitle>
            <CardDescription>
              Rules to exclude reviewers with potential conflicts of interest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclude-manuscript-authors">
                  Exclude Manuscript Authors
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exclude authors who appear in the manuscript being reviewed
                </p>
              </div>
              <Switch
                id="exclude-manuscript-authors"
                checked={rules.excludeManuscriptAuthors}
                onCheckedChange={(checked) => updateRule('excludeManuscriptAuthors', checked)}
                disabled={disabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclude-co-authors">
                  Exclude Co-Authors
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exclude authors who have co-authored papers with manuscript authors
                </p>
              </div>
              <Switch
                id="exclude-co-authors"
                checked={rules.excludeCoAuthors}
                onCheckedChange={(checked) => updateRule('excludeCoAuthors', checked)}
                disabled={disabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclude-institutional">
                  Exclude Institutional Conflicts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exclude reviewers from the same institution as manuscript authors
                </p>
              </div>
              <Switch
                id="exclude-institutional"
                checked={rules.excludeInstitutionalConflicts}
                onCheckedChange={(checked) => updateRule('excludeInstitutionalConflicts', checked)}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quality Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Requirements</CardTitle>
            <CardDescription>
              Minimum requirements for reviewer qualifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minimum-publications">
                Minimum Publications
              </Label>
              <Input
                id="minimum-publications"
                type="number"
                min="0"
                max="100"
                value={rules.minimumPublications}
                onChange={(e) => updateRule('minimumPublications', parseInt(e.target.value) || 0)}
                disabled={disabled}
                className="w-24"
              />
              <p className="text-sm text-muted-foreground">
                Minimum number of publications required for a reviewer to be considered
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="max-retractions">
                Maximum Retractions
              </Label>
              <Input
                id="max-retractions"
                type="number"
                min="0"
                max="20"
                value={rules.maxRetractions}
                onChange={(e) => updateRule('maxRetractions', parseInt(e.target.value) || 0)}
                disabled={disabled}
                className="w-24"
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of retracted papers allowed for a reviewer
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};