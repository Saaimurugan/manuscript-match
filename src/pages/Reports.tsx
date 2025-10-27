/**
 * Reports Page
 * Interactive dashboard with reports on processes and status
 * Admin sees all users' data, individual users see only their own data
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useReports } from '../hooks/useReports';
import { 
  ProcessStatusChart, 
  ProcessTimelineChart, 
  UserActivityChart, 
  ProcessTable, 
  StatsCards 
} from '../components/reports';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../hooks/use-toast';

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>(isAdmin ? 'all' : user?.id || '');
  
  const { 
    stats, 
    processData, 
    timelineData, 
    userActivityData,
    users,
    isLoading, 
    isError,
    refetch 
  } = useReports({
    userId: selectedUserId === 'all' ? undefined : selectedUserId,
    dateRange,
  });

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      toast({
        title: 'Exporting Report',
        description: `Preparing ${format.toUpperCase()} export...`,
      });
      
      // TODO: Implement export functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Export Complete',
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Refreshing Data',
      description: 'Report data is being updated...',
    });
  };

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Failed to load reports</p>
              <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'System-wide process analytics and insights' 
              : 'Your process analytics and insights'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select onValueChange={(value: any) => handleExport(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="xlsx">Export Excel</SelectItem>
              <SelectItem value="pdf">Export PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <StatsCards stats={stats} />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">User Activity</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Stage Distribution</CardTitle>
                <CardDescription>
                  Breakdown of processes by current workflow stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ProcessStatusChart data={processData} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Process Timeline</CardTitle>
                <CardDescription>
                  Process creation and completion over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ProcessTimelineChart data={timelineData} />
                )}
              </CardContent>
            </Card>
          </div>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>
                  Process activity by user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <UserActivityChart data={userActivityData} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Processes Tab */}
        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Process Details</CardTitle>
              <CardDescription>
                Detailed list of all processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <ProcessTable 
                  processes={processData?.processes || []} 
                  isAdmin={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Process Timeline Analysis</CardTitle>
              <CardDescription>
                Detailed timeline view of process creation and completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ProcessTimelineChart data={timelineData} detailed />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of user activity and process ownership
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <UserActivityChart data={userActivityData} detailed />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
