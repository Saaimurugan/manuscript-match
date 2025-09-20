import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ActivityLog } from '@/components/activity/ActivityLog';
import { ProcessActivityLog } from '@/components/activity/ProcessActivityLog';
import { useActivityLogs, useProcessActivityLogs } from '@/hooks/useActivityLogs';
import { ActivityLogger } from '@/services/activityLogger';

/**
 * Example component demonstrating the new activity logging system integration
 * 
 * This example shows:
 * 1. How to use the ActivityLog component for admin/global activity logs
 * 2. How to use the ProcessActivityLog component for process-specific logs
 * 3. How to use the activity logging hooks directly
 * 4. How to configure different display options
 */
export function ActivityLoggingExample() {
  const [selectedProcessId, setSelectedProcessId] = useState('process-123');
  const [currentUser] = useState('admin-user');

  // Example of using hooks directly
  const { data: adminLogs, isLoading: adminLoading } = useActivityLogs({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });

  const { data: processLogs, isLoading: processLoading } = useProcessActivityLogs(
    selectedProcessId,
    { page: 1, limit: 5 }
  );

  // Example of programmatic activity logging
  const handleLogActivity = async () => {
    const logger = ActivityLogger.getInstance();
    await logger.logActivity(
      'EXAMPLE_ACTION',
      { 
        description: 'User clicked example button',
        timestamp: new Date().toISOString(),
        metadata: { buttonId: 'example-btn' }
      },
      selectedProcessId
    );
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Logging System Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin-logs" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="admin-logs">Admin Logs</TabsTrigger>
              <TabsTrigger value="process-logs">Process Logs</TabsTrigger>
              <TabsTrigger value="realtime">Real-time</TabsTrigger>
              <TabsTrigger value="hooks">Direct Hooks</TabsTrigger>
            </TabsList>

            {/* Admin Activity Logs */}
            <TabsContent value="admin-logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Activity Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityLog
                    currentUser={currentUser}
                    showFilters={true}
                    height="400px"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Process-Specific Activity Logs */}
            <TabsContent value="process-logs" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={selectedProcessId === 'process-123' ? 'default' : 'outline'}
                  onClick={() => setSelectedProcessId('process-123')}
                >
                  Process 123
                </Button>
                <Button
                  variant={selectedProcessId === 'process-456' ? 'default' : 'outline'}
                  onClick={() => setSelectedProcessId('process-456')}
                >
                  Process 456
                </Button>
                <Button
                  variant={selectedProcessId === 'process-789' ? 'default' : 'outline'}
                  onClick={() => setSelectedProcessId('process-789')}
                >
                  Process 789
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Process Activity Logs - {selectedProcessId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProcessActivityLog
                    processId={selectedProcessId}
                    height="350px"
                    showPagination={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Real-time Activity Logs */}
            <TabsContent value="realtime" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Activity Logs</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Updates automatically every 5 seconds
                  </p>
                </CardHeader>
                <CardContent>
                  <ActivityLog
                    enableRealtime={true}
                    showFilters={true}
                    height="400px"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Direct Hook Usage */}
            <TabsContent value="hooks" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Logs Hook</CardTitle>
                    <Button onClick={handleLogActivity} className="w-fit">
                      Log Example Activity
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {adminLoading ? (
                      <p>Loading admin logs...</p>
                    ) : (
                      <div className="space-y-2">
                        <p><strong>Total Activities:</strong> {adminLogs?.pagination.total || 0}</p>
                        <p><strong>Current Page:</strong> {adminLogs?.pagination.page || 1}</p>
                        <p><strong>Activities on Page:</strong> {adminLogs?.data.length || 0}</p>
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Recent Activities:</h4>
                          <div className="space-y-1 text-sm">
                            {adminLogs?.data.slice(0, 3).map((activity) => (
                              <div key={activity.id} className="p-2 bg-muted rounded">
                                <span className="font-medium">{activity.action}</span>
                                <span className="text-muted-foreground ml-2">
                                  {activity.formattedTimestamp}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Process Logs Hook</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Process: {selectedProcessId}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {processLoading ? (
                      <p>Loading process logs...</p>
                    ) : (
                      <div className="space-y-2">
                        <p><strong>Total Activities:</strong> {processLogs?.pagination.total || 0}</p>
                        <p><strong>Current Page:</strong> {processLogs?.pagination.page || 1}</p>
                        <p><strong>Activities on Page:</strong> {processLogs?.data.length || 0}</p>
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Recent Activities:</h4>
                          <div className="space-y-1 text-sm">
                            {processLogs?.data.slice(0, 3).map((activity) => (
                              <div key={activity.id} className="p-2 bg-muted rounded">
                                <span className="font-medium">{activity.action}</span>
                                <span className="text-muted-foreground ml-2">
                                  {activity.formattedTimestamp}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Configuration Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Compact Activity Log</h4>
              <ActivityLog
                showFilters={false}
                height="200px"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Process Timeline</h4>
              <ProcessActivityLog
                processId={selectedProcessId}
                height="200px"
                showPagination={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">ActivityLog Component</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Use for admin dashboards and global activity monitoring</li>
                <li>Supports filtering, searching, and pagination</li>
                <li>Can enable real-time updates with <code>enableRealtime={true}</code></li>
                <li>Customizable height and filter visibility</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">ProcessActivityLog Component</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Use for process-specific activity tracking</li>
                <li>Compact timeline view with process context</li>
                <li>Optional pagination for large activity sets</li>
                <li>Automatically filters to specific process</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">Activity Logging Hooks</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code>useActivityLogs(query)</code> - For admin/global logs with filtering</li>
                <li><code>useProcessActivityLogs(processId, query)</code> - For process-specific logs</li>
                <li><code>useRealtimeActivityLogs(query, interval)</code> - For real-time updates</li>
                <li>All hooks return React Query results with data, loading, and error states</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">ActivityLogger Service</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code>ActivityLogger.getInstance()</code> - Get singleton instance</li>
                <li><code>setUser(userId)</code> - Set current user for logging context</li>
                <li><code>logActivity(action, details, processId)</code> - Log activity (handled by backend middleware)</li>
                <li><code>getUserActivities(query)</code> - Fetch admin logs with filtering</li>
                <li><code>getProcessActivities(processId, query)</code> - Fetch process logs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ActivityLoggingExample;