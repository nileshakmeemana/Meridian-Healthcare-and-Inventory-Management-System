'use client';
// src/components/layout/Header.tsx
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useState, useEffect } from 'react';
import { notificationAPI } from '@/lib/api';

export default function Header() {
  const user = useAuthStore((s) => s.user);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cnt = await notificationAPI.getUnreadCount();
        if (!mounted) return;
        setUnreadCount(Number(cnt.data?.count ?? 0));
      } catch (e) {}
    })();
    return () => { mounted = false };
  }, []);

  // Fetch notifications on mount when user is present
  useEffect(() => {
    let mounted = true;
    if (!user) return;
    (async () => {
      try {
        const res = await notificationAPI.getAll();
        if (!mounted) return;
        setNotifications(res.data?.data || res.data || []);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false };
  }, [user]);

  // Poll unread count every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const cnt = await notificationAPI.getUnreadCount();
        setUnreadCount(Number(cnt.data?.count ?? 0));
      } catch (e) {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients, medicines..."
            className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 text-right ml-auto">
        <div className="hidden md:block text-right mr-3">
          <p className="text-sm font-semibold text-foreground">{timeStr}</p>
          <p className="text-xs text-muted-foreground">{dateStr}</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={async () => {
            try {
              if (!open) {
                const res = await notificationAPI.getAll();
                setNotifications(res.data?.data || res.data || []);
                // mark unread count will be updated after fetching
                const cnt = await notificationAPI.getUnreadCount();
                setUnreadCount(Number(cnt.data?.count ?? 0));
              }
            } catch (e) {
              // ignore fetch errors silently
            }
            setOpen((v) => !v);
          }}
          className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1.5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 text-sm font-semibold">Notifications</div>
            <div className="max-h-64 overflow-auto">
              {notifications.length === 0 ? (
                <div className="p-3 text-xs text-gray-500">No notifications</div>
              ) : (
                notifications.slice(0, 3).map((n, i) => {
                  const id = n.notification_id ?? n.NOTIFICATION_ID ?? n.id ?? i;
                  const title = n.title ?? n.TITLE ?? n.message ?? n.MESSAGE ?? 'Notification';
                  const message = n.message ?? n.MESSAGE ?? '';
                  const created = n.created_at ?? n.CREATED_AT ?? n.createdAt ?? '';
                  return (
                    <div key={id} className="px-3 py-2 hover:bg-gray-50 text-sm">
                      <div className="text-gray-800">{title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{created}</div>
                      {message && <div className="text-xs text-gray-500 truncate mt-1">{message}</div>}
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-3 py-2 border-t border-gray-100 text-xs">
              {notifications.length > 3 ? (
                <div className="text-center mb-2">
                  <a href="/dashboard/notifications" className="text-blue-600">View all notifications</a>
                </div>
              ) : null}
              <div className="text-center">
                <button
                  onClick={async () => {
                    try {
                      await notificationAPI.markAllRead();
                      setUnreadCount(0);
                    } catch (e) {}
                  }}
                  className="text-blue-600"
                >
                  Mark all read
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-meridian-500 flex items-center justify-center text-white text-sm font-bold">
        {(user?.firstName?.[0] || user?.username?.[0] || 'M').toUpperCase()}
      </div>
    </header>
  );
}
