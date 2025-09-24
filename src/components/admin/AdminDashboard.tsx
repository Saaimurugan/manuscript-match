import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Activity, 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Database, 
  TrendingUp, 
  Shield,
  Settings,
  BarChart3,
  Clock,
  Server,
  UserCheck,
  UserX,
  Workflow,
  Eye,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useAdminStats, 
  useAdminSystemHealth,
  useAdminSystemAlerts,
  useRefreshAdminData,
  useAdminPermissions
} from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// Import the new admin components
import { UserManagement } from "./UserManagement";
import { PermissionManagement } from "./PermissionManagement";
import { ProcessManagement } from "./ProcessManagement";
import { ActivityLogViewer } from "./ActivityLogViewer";

interface AdminDashboardProps {
  currentUser?: any;
  permissions?: string[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser, 
  permissions = [] 
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Use provided user or fallback to auth user
  const effectiveUser = currentUser || user;

  // Admin permission check
  const { data: hasAdminPermissions, isLoading: checkingPermissions } = useAdminPermissions();

  // Admin data hooks
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminStats();
  const { data: systemHealth, isLoading: healthLoading } = useAdminSystemHealth();
  const { data: systemAlerts, isLoading: alertsLoading } = useAdminSystemAlerts({ limit: 5 });

  // Admin actions
  const { refreshAll } = useRefreshAdminData();

  // Auto-refresh system health every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshAll]);

  // Navigation items with role-based visibility
  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      description: "System metrics and health",
      requiredPermissions: []
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      description: "Manage users and roles",
      requiredPermissions: ["user.manage"]
    },
    {
      id: "permissions",
      label: "Permissions",
      icon: Shield,
      description: "Manage permissions and access",
      requiredPermissions: ["permission.manage"]
    },
    {
      id: "processes",
      label: "Process Management",
      icon: Workflow,
      description: "Manage system processes",
      requiredPermissions: ["process.manage"]
    },
    {
      id: "activity",
      label: "Activity Logs",
      icon: Activity,
      description: "View system activity",
      requiredPermissions: ["activity.view"]
    },
    {
      id: "system",
      label: "System Health",
      icon: Server,
      description: "Monitor system status",
      requiredPermissions: ["system.monitor"]
    }
  ];

  // Filter navigation based on permissions
  const visibleNavItems = navigationItems.filter(item => 
    item.requiredPermissions.length === 0 || 
    item.requiredPermissions.some(perm => permissions.includes(perm))
  );

  // Check if user has admin permissions
  if (checkingPermissions) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Checking admin permissions...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasAdminPermissions) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
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
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <span>Error Loading Dashboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load admin data. Please try refreshing the page.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => refreshAll()} className="mt-4 w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">System Management</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-700 border border-blue-200" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className={cn("h-5 w-5", sidebarCollapsed ? "mx-auto" : "mr-3")} />
                  {!sidebarCollapsed && (
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-blue-600" />
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{effectiveUser?.email}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {visibleNavItems.find(item => item.id === activeTab)?.label || "Dashboard"}
              </h2>
              <p className="text-sm text-gray-500">
                {visibleNavItems.find(item => item.id === activeTab)?.description}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* System Health Indicator */}
              {systemHealth && (
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    systemHealth.status === 'healthy' ? "bg-green-500" :
                    systemHealth.status === 'degraded' ? "bg-yellow-500" :
                    "bg-red-500"
                  )} />
                  <span className="text-sm text-gray-600">
                    System {systemHealth.status}
                  </span>
                </div>
              )}
              
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshAll()}
                disabled={statsLoading}
              >
                <RefreshCw className={cn("h-4 w-4", statsLoading && "animate-spin")} />
                {!sidebarCollapsed && <span className="ml-2">Refresh</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* System Health Alerts */}
          {systemAlerts && systemAlerts.length > 0 && activeTab === "overview" && (
            <div className="mb-6">
              <div className="space-y-3">
                {systemAlerts.slice(0, 3).map((alert) => (
                  <Alert key={alert.id} className={cn(
                    "border-l-4",
                    alert.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                    alert.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
                    alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                    'border-l-blue-500 bg-blue-50'
                  )}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{alert.severity.toUpperCase()}:</span> {alert.message}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="space-y-6">

            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                      <Users className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <div className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Registered users</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Active Processes</CardTitle>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <div className="text-3xl font-bold text-gray-900">{stats?.activeProcesses || 0}</div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Currently running</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Processes</CardTitle>
                      <Workflow className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      {statsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <div className="text-3xl font-bold text-gray-900">{stats?.totalProcesses || 0}</div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">All time</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
                      {systemHealth?.status === 'healthy' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : systemHealth?.status === 'degraded' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </CardHeader>
                    <CardContent>
                      {healthLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <div className={cn(
                          "text-3xl font-bold capitalize",
                          systemHealth?.status === 'healthy' ? "text-green-600" :
                          systemHealth?.status === 'degraded' ? "text-yellow-600" :
                          "text-red-600"
                        )}>
                          {systemHealth?.status || 'Unknown'}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Current status</p>
                    </CardContent>
                  </Card>
                </div>

                {/* System Health Details */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        System Services
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {healthLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                          ))}
                        </div>
                      ) : systemHealth ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Database</span>
                            <Badge variant={systemHealth.services.database === 'up' ? 'default' : 'destructive'}>
                              {systemHealth.services.database}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">External APIs</span>
                            <Badge variant={systemHealth.services.externalApis === 'up' ? 'default' : 'destructive'}>
                              {systemHealth.services.externalApis}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Uptime</span>
                            <span className="text-sm text-gray-600">
                              {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Version</span>
                            <span className="text-sm text-gray-600">{systemHealth.version}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Unable to load system health</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">System started</p>
                            <p className="text-xs text-gray-500">
                              {systemHealth && format(new Date(Date.now() - systemHealth.uptime * 1000), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Dashboard accessed</p>
                            <p className="text-xs text-gray-500">Just now</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Data refreshed</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <UserManagement />
            )}

            {activeTab === "permissions" && (
              <PermissionManagement />
            )}

            {activeTab === "processes" && (
              <ProcessManagement />
            )}

            {activeTab === "activity" && (
              <ActivityLogViewer />
            )}

            {activeTab === "system" && (
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
                          <span className="text-sm text-gray-600">{systemHealth.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Uptime:</span>
                          <span className="text-sm text-gray-600">
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
                      <p className="text-gray-500">Unable to load system information</p>
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
                              <p className="text-xs text-gray-500">
                                {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No recent alerts</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};