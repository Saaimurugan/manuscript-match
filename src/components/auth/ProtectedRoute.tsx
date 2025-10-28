/**
 * Protected route component that requires authentication
 * Redirects to login if user is not authenticated
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export type UserRole = 'USER' | 'QC' | 'MANAGER' | 'ADMIN';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  requireRoleOrHigher?: UserRole;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

/**
 * Role hierarchy levels for comparison
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 1,
  QC: 2,
  MANAGER: 3,
  ADMIN: 4,
};

/**
 * Check if user has required role or higher
 */
const hasRoleOrHigher = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if user has any of the required roles
 */
const hasAnyRole = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole);
};

/**
 * Enhanced protected route component with role hierarchy support
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredRoles,
  requireRoleOrHigher,
  fallback,
  showAccessDenied = true
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Return null while redirecting to login
  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access if required
  const userRole = user?.role as UserRole;
  let hasAccess = true;
  let accessReason = '';

  if (requiredRole && userRole !== requiredRole) {
    hasAccess = false;
    accessReason = `Required role: ${requiredRole}, Your role: ${userRole}`;
  } else if (requiredRoles && !hasAnyRole(userRole, requiredRoles)) {
    hasAccess = false;
    accessReason = `Required roles: ${requiredRoles.join(', ')}, Your role: ${userRole}`;
  } else if (requireRoleOrHigher && !hasRoleOrHigher(userRole, requireRoleOrHigher)) {
    hasAccess = false;
    accessReason = `Required role: ${requireRoleOrHigher} or higher, Your role: ${userRole}`;
  }

  if (!hasAccess) {
    if (!showAccessDenied) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
            {accessReason}
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Admin route component that requires admin role
 */
export const AdminRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => {
  return (
    <ProtectedRoute requiredRole="ADMIN" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Manager route component that requires manager role or higher
 */
export const ManagerRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => {
  return (
    <ProtectedRoute requireRoleOrHigher="MANAGER" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * QC route component that requires QC role or higher
 */
export const QCRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => {
  return (
    <ProtectedRoute requireRoleOrHigher="QC" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Staff route component that requires QC, Manager, or Admin role
 */
export const StaffRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => {
  return (
    <ProtectedRoute requiredRoles={['QC', 'MANAGER', 'ADMIN']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;