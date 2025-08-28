import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Activity } from "lucide-react";
import { ActivityLogger, ActivityLog as ActivityLogType } from "@/services/activityLogger";
import { format } from "date-fns";

interface ActivityLogProps {
  userId?: string;
  currentUser?: string;
}

export function ActivityLog({ userId, currentUser }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const logger = ActivityLogger.getInstance();
      const logs = await logger.getUserActivities(userId);
      setActivities(logs);
      setLoading(false);
    };

    fetchActivities();
    
    // Refresh activities every 5 seconds
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case "login":
        return "default";
      case "upload":
        return "secondary";
      case "search":
        return "outline";
      case "export":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
          {currentUser && (
            <Badge variant="outline" className="ml-auto">
              <User className="h-3 w-3 mr-1" />
              {currentUser}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No activities recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-l-2 border-muted pl-4 pb-4 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionBadgeVariant(activity.action_type)}>
                          {activity.action_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.created_at
                            ? format(new Date(activity.created_at), "MMM dd, HH:mm:ss")
                            : "Unknown time"}
                        </span>
                      </div>
                      <p className="text-sm">{activity.action_description}</p>
                      {activity.metadata && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span>{" "}
                              {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}