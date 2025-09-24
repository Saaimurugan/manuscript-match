/**
 * Protected admin route component with enhanced security and logging
 * Provides comprehensive access control for admin pages
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from './PermissionGate';
import { LoginForm } from './LoginForm';

export interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  requiredRole?: 'QC' | 'MANAGER' | 'ADMIN';
  fallback?: React.ReactNode;
  enableAuditLogging?: boolean;
  pageTitle?: string;
}

/**
 * Protected admin route component with enhanced security features
 */
export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
  requiredRole = 'ADMIN',
  fallback,
  enableAuditLogging = true,
  pageTitle = 'Admin Page',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { hasRoleOrHigher } = usePermissions();

  // Log admin page access attempts
  useEffect(() => {
    if (enableAuditLogging && isAuthenticated && user) {
      const logData = {
        action: 'ADMIN_PAGE_ACCESS',
        pageTitle,
        userRole: user.role,
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      };

      // Log to console for development (in production, this would go to a logging service)
      console.log('Admin page access:', logData);

      // In a real application, you would send this to your logging service
      // auditLogger.logAdminAccess(logData);
    }
  }, [isAuthenticated, user, pageTitle, enableAuditLogging]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Verifying Access</h3>
            <p className="text-sm text-gray-500">Checking your permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return fallback || <LoginForm />;
  }

  // Check if user has required admin role
  if (!hasRoleOrHigher(requiredRole)) {
    // Log unauthorized access attempt
    if (enableAuditLogging) {
      const logData = {
        action: 'UNAUTHORIZED_ADMIN_ACCESS',
        pageTitle,
        userRole: user?.role,
        requiredRole,
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      };

      console.warn('Unauthorized admin access attempt:', logData);
      // auditLogger.logUnauthorizedAccess(logData);
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Administrative Access Required
              </h2>
              
              <p className="text-gray-600 mb-6">
                You need {requiredRole.toLowerCase()} privileges or higher to access this page.
              </p>
              
              <div className="bg-gray-50 rounded-md p-4 mb-6">
                <div className="text-sm text-gray-700">
                  <p><strong>Your Role:</strong> {user?.role}</p>
                  <p><strong>Required Role:</strong> {requiredRole} or higher</p>
                  <p><strong>Page:</strong> {pageTitle}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go Back
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  If you believe you should have access to this page, please contact your administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User has required permissions, render the protected content
  return <>{children}</>;
};

/**
 * Convenience components for specific admin role requirements
 */

export const AdminOnlyRoute: React.FC<{ children: React.ReactNode; pageTitle?: string }> = ({
  children,
  pageTitle = 'Admin Dashboard',
}) => (
  <ProtectedAdminRoute requiredRole="ADMIN" pageTitle={pageTitle}>
    {children}
  </ProtectedAdminRoute>
);

export const ManagerRoute: React.FC<{ children: React.ReactNode; pageTitle?: string }> = ({
  children,
  pageTitle = 'Manager Dashboard',
}) => (
  <ProtectedAdminRoute requiredRole="MANAGER" pageTitle={pageTitle}>
    {children}
  </ProtectedAdminRoute>
);

export const QCRoute: React.FC<{ children: React.ReactNode; pageTitle?: string }> = ({
  children,
  pageTitle = 'Quality Control Dashboard',
}) => (
  <ProtectedAdminRoute requiredRole="QC" pageTitle={pageTitle}>
    {children}
  </ProtectedAdminRoute>
);

export default ProtectedAdminRoute;