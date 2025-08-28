import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id?: string;
  user_id: string;
  action_type: string;
  action_description: string;
  metadata?: any;
  created_at?: string;
}

export class ActivityLogger {
  private static instance: ActivityLogger;
  private currentUser: string | null = null;

  private constructor() {}

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  setUser(username: string) {
    this.currentUser = username;
  }

  clearUser() {
    this.currentUser = null;
  }

  async logActivity(
    actionType: string,
    actionDescription: string,
    metadata?: any
  ) {
    if (!this.currentUser) {
      console.warn("No user set for activity logging");
      return;
    }

    try {
      const { error } = await supabase.from("user_activity_logs").insert({
        user_id: this.currentUser,
        action_type: actionType,
        action_description: actionDescription,
        metadata: metadata || null,
      });

      if (error) {
        console.error("Failed to log activity:", error);
      }
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  }

  async getUserActivities(userId?: string): Promise<ActivityLog[]> {
    try {
      const query = supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId) {
        query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch activities:", error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error("Error fetching activities:", err);
      return [];
    }
  }
}