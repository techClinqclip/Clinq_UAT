import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    if (!localStorage.getItem("access_token") && !localStorage.getItem("access")) return;
    try {
      const response = await api("/api/notifications/notifications/?page_size=50");
      setNotifications((response.results || []).map((notification) => ({
        id: notification.id,
        type: notification.event?.event_type || notification.event?.category || "system",
        actor: { name: notification.event?.title || "Clinq", avatar: null },
        text: notification.event?.message || "You have a new notification.",
        timestamp: new Date(notification.created_at).getTime(),
        read: notification.is_read,
        backendId: notification.id,
      })));
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('auth-changed', loadNotifications);
    const interval = window.setInterval(loadNotifications, 30000);
    return () => {
      window.removeEventListener('auth-changed', loadNotifications);
      window.clearInterval(interval);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await api(`/api/notifications/notifications/${id}/read/`, { method: "POST" }); } catch {}
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await api("/api/notifications/notifications/mark_all_read/", { method: "POST", body: { unread_only: true } }); } catch {}
  };

  const value = { notifications, unreadCount, markRead, markAllRead };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}