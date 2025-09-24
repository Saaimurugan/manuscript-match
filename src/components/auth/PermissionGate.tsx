/**
 * Permission-based component rendering utilities
 * Conditionally renders components based on user permissions and roles
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export type UserRole = 'USER' | 'QC' | 'MANAGER' | 'ADMIN';

export interface PermissionGateProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  requireRoleOrHigher?: UserRole;
  fallback?: React.ReactNode;
  showFallback?: boolean;
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
 * Permission gate component that conditionally renders children based on user permissions
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredRole,
  requiredRoles,
  requireRoleOrHigher,
  fallback = null,
  showFallback = true,
}) => {
  const { isAuthenticated, user } = useAuth();

  // Don't render anything if not authenticated
  if (!isAuthenticated || !user) {
    return showFallback ? fallback : null;
  }

  const userRole = user.role as UserRole;
  let hasPermission = true;

  // Check specific role requirement
  if (requiredRole && userRole !== requiredRole) {
    hasPermission = false;
  }

  // Check multiple roles requirement (any of)
  if (requiredRoles && !hasAnyRole(userRole, requiredRoles)) {
    hasPermission = false;
  }

  // Check role hierarchy requirement
  if (requireRoleOrHigher && !hasRoleOrHigher(userRole, requireRoleOrHigher)) {
    hasPermission = false;
  }

  if (!hasPermission) {
    return showFallback ? fallback : null;
  }

  return <>{children}</>;
};

/**
 * Hook for checking user permissions
 */
export const usePermissions = () => {
  const { isAuthenticated, user } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return roles.includes(user.role as UserRole);
  };

  const hasRoleOrHigher = (role: UserRole): boolean => {
    if (!isAuthenticated || !user) return false;
    const userRole = user.role as UserRole;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role];
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isManager = (): boolean => hasRoleOrHigher('MANAGER');
  const isQC = (): boolean => hasRoleOrHigher('QC');
  const isStaff = (): boolean => hasAnyRole(['QC', 'MANAGER', 'ADMIN']);

  return {
    hasRole,
    hasAnyRole,
    hasRoleOrHigher,
    isAdmin,
    isManager,
    isQC,
    isStaff,
    userRole: user?.role as UserRole,
  };
};

/**
 * Convenience components for common permission checks
 */

export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requiredRole="ADMIN" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const ManagerOrHigher: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requireRoleOrHigher="MANAGER" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const QCOrHigher: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requireRoleOrHigher="QC" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const StaffOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requiredRoles={['QC', 'MANAGER', 'ADMIN']} fallback={fallback}>
    {children}
  </PermissionGate>
);

/**
 * Higher-order component for permission-based rendering
 */
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  permissionConfig: Omit<PermissionGateProps, 'children'>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <PermissionGate {...permissionConfig}>
      <Component {...props} />
    </PermissionGate>
  );

  WrappedComponent.displayName = `withPermissions(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default PermissionGate;