import { supabase, isSupabaseConfigured } from "./lib/supabase";

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  projectId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Could not fetch notifications from Supabase:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type || "video_created",
      title: row.title,
      message: row.message,
      projectId: row.project_id || null,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn("fetchUserNotifications caught error:", err);
    return [];
  }
}

export async function markNotificationAsRead(userId: string, id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId || !id) return false;
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.warn("Could not mark notification as read:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("markNotificationAsRead error:", err);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.warn("Could not mark all notifications as read:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("markAllNotificationsAsRead error:", err);
    return false;
  }
}

export async function createNotification(
  userId: string,
  params: {
    title: string;
    message: string;
    projectId?: string | null;
    type?: string;
  }
): Promise<AppNotification | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const row = {
      user_id: userId,
      type: params.type || "video_created",
      title: params.title,
      message: params.message,
      project_id: params.projectId || null,
      is_read: false,
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.warn("Could not create notification in Supabase:", error.message);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      projectId: data.project_id || null,
      isRead: Boolean(data.is_read),
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn("createNotification error:", err);
    return null;
  }
}
