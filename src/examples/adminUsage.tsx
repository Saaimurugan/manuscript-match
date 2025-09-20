/**
 * Example usage of admin dashboard functionality
 * Demonstrates how to use admin services, hooks, and components
 */

import React, { useState } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { 
  useAdminStats, 
  useAdminProcesses, 
  useAdminUsers,
  useAdminPermissions,
  useUpdateUserRole,
  useDeleteUser,
  useAdminExport
} from '@/hooks/useAdmin';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Activity, Download } from 'lucide-react';

/**
 * Example 1: Basic Admin Dashboard Usage
 */
export const BasicAdminDashboard: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <AdminDashboard />
    </div>
  );
};

/**
 * Example 2: Custom Admin Statistics Display
 */
export const CustomAdminStats: React.FC = () => {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) return <div>Loading admin statistics...</div>;
  if (error) return <div>Error loading stats: {error.message}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          <p className="text-xs text-muted-foreground">
            Registered users in the system
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Processes</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeProcesses || 0}</div>
          <p className="text-xs text-muted-foreground">
            Currently running processes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.totalProcesses ? 
              Math.round((stats.completedProcesses / stats.totalProcesses) * 100) : 0}%
          </div>
          <p className="text-xs text-muted-foreground">
            Process completion rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalSearches || 0}</div>
          <p className="text-xs text-muted-foreground">
            Database searches performed
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Example 3: Admin Permission Check Component
 */
export const AdminPermissionCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: hasPermissions, isLoading } = useAdminPermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasPermissions) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have admin permissions to access this content.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

/**
 * Example 4: User Management Component
 */
export const UserManagement: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data: users, isLoading } = useAdminUsers({ page, limit: 10 });
  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();

  const handleRoleUpdate = (userId: string, newRole: 'USER' | 'ADMIN') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (isLoading) return <div>Loading users...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users?.data.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {user.processCount} processes, {user.activityCount} activities
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRoleUpdate(
                    user.id, 
                    user.role === 'ADMIN' ? 'USER' : 'ADMIN'
                  )}
                  disabled={updateRoleMutation.isLoading}
                >
                  Toggle Role
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteUser(user.id)}
                  disabled={deleteUserMutation.isLoading}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {users?.pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={!users?.pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example 5: Data Export Component
 */
export const DataExport: React.FC = () => {
  const exportMutation = useAdminExport();

  const handleExport = (type: 'users' | 'processes' | 'activities', format: 'csv' | 'xlsx') => {
    exportMutation.mutate({
      type,
      format,
      dateFrom: '2024-01-01',
      dateTo: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Export
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <h4 className="font-medium">Users</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('users', 'csv')}
                disabled={exportMutation.isLoading}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('users', 'xlsx')}
                disabled={exportMutation.isLoading}
              >
                XLSX
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Processes</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('processes', 'csv')}
                disabled={exportMutation.isLoading}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('processes', 'xlsx')}
                disabled={exportMutation.isLoading}
              >
                XLSX
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Activities</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('activities', 'csv')}
                disabled={exportMutation.isLoading}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('activities', 'xlsx')}
                disabled={exportMutation.isLoading}
              >
                XLSX
              </Button>
            </div>
          </div>
        </div>

        {exportMutation.isLoading && (
          <p className="text-sm text-muted-foreground mt-4">
            Preparing export... This may take a few moments.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Example 6: Direct Admin Service Usage
 */
export const DirectAdminServiceExample: React.FC = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const hasPermissions = await adminService.checkAdminPermissions();
      alert(`Admin permissions: ${hasPermissions ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error('Permission check failed:', error);
    }
  };

  const exportUsers = async () => {
    try {
      await adminService.exportData({
        type: 'users',
        format: 'csv',
        dateFrom: '2024-01-01',
        dateTo: new Date().toISOString().split('T')[0],
      });
      alert('Export started successfully');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Admin Service Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={fetchStats} disabled={loading}>
            Fetch Stats
          </Button>
          <Button onClick={checkPermissions}>
            Check Permissions
          </Button>
          <Button onClick={exportUsers}>
            Export Users
          </Button>
        </div>

        {stats && (
          <div className="p-4 bg-muted rounded">
            <pre>{JSON.stringify(stats, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Example 7: Complete Admin Page
 */
export const CompleteAdminPage: React.FC = () => {
  return (
    <AdminPermissionCheck>
      <div className="container mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
        <CustomAdminStats />
        
        <div className="grid gap-6 md:grid-cols-2">
          <UserManagement />
          <DataExport />
        </div>
        
        <AdminDashboard />
      </div>
    </AdminPermissionCheck>
  );
};