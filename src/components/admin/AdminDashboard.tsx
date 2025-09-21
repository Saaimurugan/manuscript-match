import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Users, Activity, FileText, Download, RefreshCw, Calendar, AlertTriangle, CheckCircle, XCircle, Database, TrendingUp, Shield } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useAdminStats, 
  useAdminProcesses, 
  useAdminLogs, 
  useAdminUsers,
  useAdminPermissions,
  useAdminSystemHealth,
  useAdminSystemAlerts,
  useRefreshAdminData,
  useAdminExport
} from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorReportsViewer } from "./ErrorReportsViewer";

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [processFilters, setProcessFilters] = useState({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const
  });
  const [userFilters, setUserFilters] = useState({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const
  });
  const [logFilters, setLogFilters] = useState({
    page: 1,
    limit: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc' as const
  });

  // Admin permission check
  const { data: hasAdminPermissions, isLoading: checkingPermissions } = useAdminPermissions();

  // Admin data hooks
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminStats();
  const { data: processes, isLoading: processesLoading } = useAdminProcesses(processFilters);
  const { data: users, isLoading: usersLoading } = useAdminUsers(userFilters);
  const { data: logs, isLoading: logsLoading } = useAdminLogs(logFilters);
  const { data: systemHealth, isLoading: healthLoading } = useAdminSystemHealth();
  const { data: systemAlerts, isLoading: alertsLoading } = useAdminSystemAlerts({ limit: 5 });

  // Admin actions
  const { refreshAll } = useRefreshAdminData();
  const exportMutation = useAdminExport();

  // Check if user has admin permissions
  if (checkingPermissions) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Checking admin permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAdminPermissions) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-destructive" />
              <span>Access Denied</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have admin permissions to access this dashboard. Please contact your administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = (type: 'users' | 'processes' | 'activities' | 'stats', format: 'csv' | 'xlsx' | 'json') => {
    exportMutation.mutate({
      type,
      format,
      dateFrom: undefined,
      dateTo: undefined
    });
  };

  if (statsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Admin Dashboard</span>
            </CardTitle>
            <CardDescription>
              Monitor user activities and system usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load admin data. Please try refreshing the page.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => refreshAll()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Admin Dashboard</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshAll()}
              disabled={statsLoading}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            Monitor user activities and system usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* System Health Alerts */}
          {systemAlerts && systemAlerts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                System Alerts
              </h3>
              <div className="space-y-2">
                {systemAlerts.slice(0, 3).map((alert) => (
                  <Alert key={alert.id} className={
                    alert.severity === 'critical' ? 'border-red-500' :
                    alert.severity === 'high' ? 'border-orange-500' :
                    alert.severity === 'medium' ? 'border-yellow-500' :
                    'border-blue-500'
                  }>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium">{alert.severity.toUpperCase()}:</span> {alert.message}
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                      </span>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="processes">Processes</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="activities">Activity Logs</TabsTrigger>
              <TabsTrigger value="errors">Error Reports</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{stats?.totalProcesses || 0}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Processes</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{stats?.activeProcesses || 0}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{stats?.totalSearches || 0}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* System Health Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {healthLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                    </div>
                  ) : systemHealth ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          systemHealth.status === 'healthy' ? 'text-green-600' :
                          systemHealth.status === 'degraded' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {systemHealth.status.toUpperCase()}
                        </div>
                        <p className="text-sm text-muted-foreground">Overall Status</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          systemHealth.services.database === 'up' ? 'text-green-600' :
                          systemHealth.services.database === 'degraded' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {systemHealth.services.database.toUpperCase()}
                        </div>
                        <p className="text-sm text-muted-foreground">Database</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          systemHealth.services.externalApis === 'up' ? 'text-green-600' :
                          systemHealth.services.externalApis === 'degraded' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {systemHealth.services.externalApis.toUpperCase()}
                        </div>
                        <p className="text-sm text-muted-foreground">External APIs</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {Math.floor(systemHealth.uptime / 3600)}h
                        </div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Unable to load system health</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="processes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>All Processes</CardTitle>
                    <CardDescription>
                      System-wide process management
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('processes', 'csv')}
                    disabled={exportMutation.isLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  {processesLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
                    </div>
                  ) : processes?.data ? (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Process ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Step</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processes.data.map((process) => (
                            <TableRow key={process.id}>
                              <TableCell className="font-mono text-sm">
                                {process.id.slice(0, 8)}...
                              </TableCell>
                              <TableCell className="font-medium">
                                {process.title}
                              </TableCell>
                              <TableCell className="text-sm">
                                {process.userEmail}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  process.status === 'COMPLETED' ? 'default' :
                                  process.status === 'IN_PROGRESS' ? 'secondary' :
                                  process.status === 'FAILED' ? 'destructive' :
                                  'outline'
                                }>
                                  {process.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{process.currentStep}/10</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(process.createdAt), 'MMM dd, yyyy')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No processes found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      System users and their activity
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('users', 'csv')}
                    disabled={exportMutation.isLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
                    </div>
                  ) : users?.data ? (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Processes</TableHead>
                            <TableHead>Activities</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Last Login</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.data.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>{user.processCount}</TableCell>
                              <TableCell>{user.activityCount}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, HH:mm') : 'Never'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No users found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Activity Logs</CardTitle>
                    <CardDescription>
                      System-wide user activity monitoring
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('activities', 'csv')}
                    disabled={exportMutation.isLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
                    </div>
                  ) : logs?.data ? (
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Process</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.data.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {log.userId.slice(0, 8)}...
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {log.action.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {log.processId ? `${log.processId.slice(0, 8)}...` : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No activity logs found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors">
              <ErrorReportsViewer />
            </TabsContent>

            <TabsContent value="system">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {healthLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 w-full" />
                        ))}
                      </div>
                    ) : systemHealth ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Version:</span>
                          <span className="text-sm text-muted-foreground">{systemHealth.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Uptime:</span>
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Database:</span>
                          <Badge variant={systemHealth.services.database === 'up' ? 'default' : 'destructive'}>
                            {systemHealth.services.database}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">External APIs:</span>
                          <Badge variant={systemHealth.services.externalApis === 'up' ? 'default' : 'destructive'}>
                            {systemHealth.services.externalApis}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Unable to load system information</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Recent Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alertsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 w-full" />
                        ))}
                      </div>
                    ) : systemAlerts && systemAlerts.length > 0 ? (
                      <div className="space-y-3">
                        {systemAlerts.map((alert) => (
                          <div key={alert.id} className="flex items-start gap-2">
                            <Badge variant={
                              alert.severity === 'critical' ? 'destructive' :
                              alert.severity === 'high' ? 'destructive' :
                              alert.severity === 'medium' ? 'secondary' :
                              'outline'
                            } className="text-xs">
                              {alert.severity}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm">{alert.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No recent alerts</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};