/**
 * ScholarFinder Dashboard Page
 * Main dashboard for managing ScholarFinder processes
 */

import React from 'react';
import { ProcessDashboard } from '../components/dashboard';

const ScholarFinderDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <ProcessDashboard />
    </div>
  );
};

export default ScholarFinderDashboard;