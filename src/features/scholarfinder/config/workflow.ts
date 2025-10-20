// ScholarFinder Workflow Configuration
// Configuration for workflow behavior and settings

import React from 'react';
import { ProcessStep } from '../types/process';
import { WorkflowConfiguration, FileUploadConfig } from '../types';
import { LazySteps } from '../components/steps/LazySteps';

export const workflowConfig: WorkflowConfiguration = {
  steps: [
    {
      key: ProcessStep.UPLOAD,
      title: 'Upload Manuscript',
      description: 'Upload your manuscript file for analysis',
      component: LazySteps.upload,
      estimatedDuration: 5,
    },
    {
      key: ProcessStep.METADATA,
      title: 'Review Metadata',
      description: 'Review and edit extracted manuscript metadata',
      component: LazySteps.metadata,
      estimatedDuration: 10,
      prerequisites: [ProcessStep.UPLOAD],
    },
    {
      key: ProcessStep.KEYWORDS,
      title: 'Enhance Keywords',
      description: 'Enhance keywords and generate search terms',
      component: LazySteps.keywords,
      estimatedDuration: 15,
      prerequisites: [ProcessStep.METADATA],
    },
    {
      key: ProcessStep.SEARCH,
      title: 'Search Databases',
      description: 'Search academic databases for potential reviewers',
      component: LazySteps.search,
      estimatedDuration: 20,
      prerequisites: [ProcessStep.KEYWORDS],
    },
    {
      key: ProcessStep.MANUAL,
      title: 'Manual Addition',
      description: 'Manually add specific reviewers by name',
      component: LazySteps.manual,
      isOptional: true,
      estimatedDuration: 10,
      prerequisites: [ProcessStep.SEARCH],
    },
    {
      key: ProcessStep.VALIDATION,
      title: 'Validate Authors',
      description: 'Validate potential reviewers against conflict rules',
      component: LazySteps.validation,
      estimatedDuration: 30,
      prerequisites: [ProcessStep.SEARCH],
    },
    {
      key: ProcessStep.RECOMMENDATIONS,
      title: 'Review Recommendations',
      description: 'View and filter validated reviewer recommendations',
      component: LazySteps.recommendations,
      estimatedDuration: 20,
      prerequisites: [ProcessStep.VALIDATION],
    },
    {
      key: ProcessStep.SHORTLIST,
      title: 'Create Shortlist',
      description: 'Select reviewers for your final shortlist',
      component: LazySteps.shortlist,
      estimatedDuration: 15,
      prerequisites: [ProcessStep.RECOMMENDATIONS],
    },
    {
      key: ProcessStep.EXPORT,
      title: 'Export Results',
      description: 'Export your reviewer shortlist in various formats',
      component: LazySteps.export,
      estimatedDuration: 5,
      prerequisites: [ProcessStep.SHORTLIST],
    },
  ],
  allowSkipping: true,
  allowBackNavigation: true,
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  sessionTimeout: 3600000, // 1 hour
};

export const fileUploadConfig: FileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['.doc', '.docx'],
  allowedMimeTypes: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  uploadTimeout: 60000, // 60 seconds
};

export const databaseOptions = [
  { id: 'pubmed', name: 'PubMed', description: 'MEDLINE database of life sciences literature' },
  { id: 'tandf', name: 'Taylor & Francis Online', description: 'Academic journals and books' },
  { id: 'sciencedirect', name: 'ScienceDirect', description: 'Elsevier scientific database' },
  { id: 'wiley', name: 'Wiley Online Library', description: 'Scientific, technical, and medical content' },
];

export const validationConditions = [
  {
    id: 'no_coauthor',
    name: 'No Co-authorship',
    description: 'Reviewer has not co-authored with manuscript authors',
    weight: 1,
    required: true,
  },
  {
    id: 'country_diversity',
    name: 'Country Diversity',
    description: 'Reviewer is from a different country than authors',
    weight: 0.8,
    required: false,
  },
  {
    id: 'affiliation_diversity',
    name: 'Affiliation Diversity',
    description: 'Reviewer is from a different institution than authors',
    weight: 0.9,
    required: false,
  },
  {
    id: 'publication_activity',
    name: 'Recent Publications',
    description: 'Reviewer has recent publications in relevant field',
    weight: 0.7,
    required: false,
  },
  {
    id: 'low_retractions',
    name: 'Low Retractions',
    description: 'Reviewer has minimal retracted publications',
    weight: 0.6,
    required: false,
  },
];

export const exportFormats = [
  {
    id: 'csv',
    name: 'CSV',
    description: 'Comma-separated values file',
    mimeType: 'text/csv',
    extension: '.csv',
  },
  {
    id: 'excel',
    name: 'Excel',
    description: 'Microsoft Excel spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx',
  },
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Formatted PDF report',
    mimeType: 'application/pdf',
    extension: '.pdf',
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JavaScript Object Notation file',
    mimeType: 'application/json',
    extension: '.json',
  },
];