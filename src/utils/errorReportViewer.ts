/**
 * Error Report Viewer Utility
 * Provides functions to view and manage stored error reports
 */

import { errorReportService } from '@/services/errorReportService';
import { errorLogger } from '@/services/errorLogger';
import { errorMonitoring } from '@/services/errorMonitoring';

export interface StoredErrorReport {
  errorId: string;
  message: string;
  timestamp: string;
  severity: string;
  category: string;
  userDescription?: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
}

/**
 * Get all pending error reports from localStorage
 */
export const getPendingErrorReports = (): StoredErrorReport[] => {
  try {
    const stored = localStorage.getItem('errorReports_pending');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get pending error reports:', error);
    return [];
  }
};

/**
 * Get all failed error reports from localStorage
 */
export const getFailedErrorReports = (): StoredErrorReport[] => {
  try {
    const stored = localStorage.getItem('errorReports_failed');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get failed error reports:', error);
    return [];
  }
};

/**
 * Get error logs from the error logger
 */
export const getErrorLogs = () => {
  try {
    const stored = localStorage.getItem('errorLogger_entries');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get error logs:', error);
    return [];
  }
};

/**
 * Get user actions that led to errors
 */
export const getUserActions = () => {
  try {
    const stored = localStorage.getItem('errorReports_userActions');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get user actions:', error);
    return [];
  }
};

/**
 * Get error monitoring statistics
 */
export const getErrorStatistics = () => {
  return errorMonitoring.getErrorStatistics();
};

/**
 * Get all error reports (pending + failed)
 */
export const getAllErrorReports = (): StoredErrorReport[] => {
  const pending = getPendingErrorReports();
  const failed = getFailedErrorReports();
  
  return [...pending, ...failed].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Clear all stored error reports
 */
export const clearAllErrorReports = (): void => {
  try {
    localStorage.removeItem('errorReports_pending');
    localStorage.removeItem('errorReports_failed');
    localStorage.removeItem('errorReports_userActions');
    localStorage.removeItem('errorLogger_entries');
    console.log('All error reports cleared');
  } catch (error) {
    console.error('Failed to clear error reports:', error);
  }
};

/**
 * Export error reports as JSON
 */
export const exportErrorReports = (): string => {
  const reports = {
    pending: getPendingErrorReports(),
    failed: getFailedErrorReports(),
    logs: getErrorLogs(),
    userActions: getUserActions(),
    statistics: getErrorStatistics(),
    exportedAt: new Date().toISOString()
  };
  
  return JSON.stringify(reports, null, 2);
};

/**
 * Console helper to view error reports
 */
export const viewErrorReportsInConsole = (): void => {
  console.group('📊 Error Reports Summary');
  
  const pending = getPendingErrorReports();
  const failed = getFailedErrorReports();
  const logs = getErrorLogs();
  const stats = getErrorStatistics();
  
  console.log('📋 Pending Reports:', pending.length);
  console.log('❌ Failed Reports:', failed.length);
  console.log('📝 Error Logs:', logs.length);
  console.log('📈 Statistics:', stats);
  
  if (pending.length > 0) {
    console.group('📋 Pending Reports');
    pending.forEach(report => {
      console.log(`${report.errorId}: ${report.message} (${report.severity})`);
    });
    console.groupEnd();
  }
  
  if (failed.length > 0) {
    console.group('❌ Failed Reports');
    failed.forEach(report => {
      console.log(`${report.errorId}: ${report.message} (${report.severity})`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).errorReports = {
    view: viewErrorReportsInConsole,
    getAll: getAllErrorReports,
    getPending: getPendingErrorReports,
    getFailed: getFailedErrorReports,
    getLogs: getErrorLogs,
    getStats: getErrorStatistics,
    export: exportErrorReports,
    clear: clearAllErrorReports
  };
}