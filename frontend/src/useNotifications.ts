import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth/AuthContext";
import {
  AppNotification,
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
} from "./notificationService";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadNotifications = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchUserNotifications(userId);
      setNotifications(data);
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const userId = user.id;
    loadNotifications(userId);

    // Supabase realtime subscription for notifications
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel(`public:notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadNotifications(userId);
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    }
  }, [user?.id, isAuthenticated, loadNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      await markNotificationAsRead(user.id, id);
    },
    [user?.id]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(user.id);
  }, [user?.id]);

  const handleCreateNotification = useCallback(
    async (params: { title: string; message: string; projectId?: string | null; type?: string }) => {
      if (!user?.id) return null;
      const created = await createNotification(user.id, params);
      if (created) {
        setNotifications((prev) => [created, ...prev]);
      }
      return created;
    },
    [user?.id]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    createNotification: handleCreateNotification,
    reload: () => user?.id && loadNotifications(user.id),
  };
}
