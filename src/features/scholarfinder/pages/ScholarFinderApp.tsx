// ScholarFinder Main Application Component
// Main entry point for ScholarFinder workflow

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ScholarFinderProvider } from '../contexts/ScholarFinderContext';

// Placeholder components - will be implemented in subsequent tasks
const ScholarFinderDashboard = React.lazy(() => import('./ScholarFinderDashboard'));
const ScholarFinderWizard = React.lazy(() => import('./ScholarFinderWizard'));
const ProcessList = React.lazy(() => import('./ProcessList'));

const ScholarFinderApp: React.FC = () => {
  return (
    <ScholarFinderProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<ScholarFinderDashboard />} />
          <Route path="/processes" element={<ProcessList />} />
          <Route path="/process/:processId" element={<ScholarFinderWizard />} />
          <Route path="/new" element={<ScholarFinderWizard />} />
        </Routes>
      </div>
    </ScholarFinderProvider>
  );
};

export default ScholarFinderApp;