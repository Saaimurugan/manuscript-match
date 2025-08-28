import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Activity, FileText, Search, Download, Clock, Filter } from "lucide-react";
import { ActivityLogger, ActivityLog } from "@/services/activityLogger";
import { format } from "date-fns";

interface UserActivity {
  userId: string;
  totalActions: number;
  lastActive: string;
  uploads: number;
  searches: number;
  exports: number;
}

export const AdminDashboard = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [userStats, setUserStats] = useState<UserActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    const logger = ActivityLogger.getInstance();
    const logs = await logger.getUserActivities();
    setActivities(logs);
    
    // Calculate user statistics
    const stats = calculateUserStats(logs);
    setUserStats(stats);
    setLoading(false);
  };

  const calculateUserStats = (logs: ActivityLog[]): UserActivity[] => {
    const userMap = new Map<string, UserActivity>();
    
    logs.forEach(log => {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, {
          userId: log.user_id,
          totalActions: 0,
          lastActive: log.created_at || "",
          uploads: 0,
          searches: 0,
          exports: 0,
        });
      }
      
      const stats = userMap.get(log.user_id)!;
      stats.totalActions++;
      
      if (log.action_type === "FILE_UPLOAD") stats.uploads++;
      if (log.action_type === "SEARCH") stats.searches++;
      if (log.action_type === "EXPORT") stats.exports++;
      
      if (log.created_at && new Date(log.created_at) > new Date(stats.lastActive)) {
        stats.lastActive = log.created_at;
      }
    });
    
    return Array.from(userMap.values());
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || activity.action_type === filterType;
    const matchesUser = selectedUser === "all" || activity.user_id === selectedUser;
    
    return matchesSearch && matchesType && matchesUser;
  });

  const uniqueUsers = [...new Set(activities.map(a => a.user_id))];
  const actionTypes = [...new Set(activities.map(a => a.action_type))];

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'LOGIN': return 'secondary';
      case 'FILE_UPLOAD': return 'default';
      case 'SEARCH': return 'outline';
      case 'EXPORT': return 'secondary';
      default: return 'outline';
    }
  };

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
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Statistics</TabsTrigger>
              <TabsTrigger value="activities">Activity Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{uniqueUsers.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activities.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activities.filter(a => a.action_type === 'FILE_UPLOAD').length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activities.filter(a => a.action_type === 'EXPORT').length}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Total Actions</TableHead>
                          <TableHead>Uploads</TableHead>
                          <TableHead>Searches</TableHead>
                          <TableHead>Exports</TableHead>
                          <TableHead>Last Active</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userStats.map((user) => (
                          <TableRow key={user.userId}>
                            <TableCell className="font-medium">{user.userId}</TableCell>
                            <TableCell>{user.totalActions}</TableCell>
                            <TableCell>{user.uploads}</TableCell>
                            <TableCell>{user.searches}</TableCell>
                            <TableCell>{user.exports}</TableCell>
                            <TableCell>
                              {user.lastActive ? format(new Date(user.lastActive), 'PPp') : 'Never'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Logs</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search activities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {actionTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {uniqueUsers.map(user => (
                          <SelectItem key={user} value={user}>{user}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActivities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {activity.created_at ? format(new Date(activity.created_at), 'PPp') : 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{activity.user_id}</TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(activity.action_type)}>
                                {activity.action_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{activity.action_description}</TableCell>
                            <TableCell>
                              {activity.metadata && (
                                <details className="cursor-pointer">
                                  <summary className="text-xs text-primary">View Details</summary>
                                  <pre className="text-xs mt-2 p-2 bg-muted rounded">
                                    {JSON.stringify(activity.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};