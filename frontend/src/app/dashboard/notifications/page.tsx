'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Trash2, CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { notificationAPI } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

const iconMap: Record<string, any> = {
  'error': AlertCircle,
  'warning': AlertCircle,
  'info': Info,
  'success': CheckCircle,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await notificationAPI.getAll()
      setNotifications(res.data?.data || [])
      
      const countRes = await notificationAPI.getUnreadCount()
      setUnreadCount(countRes.data?.count || 0)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const markAsRead = async (id: number) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev =>
        prev.map(n => n.NOTIFICATION_ID === id ? { ...n, IS_READ: 1 } : n)
      )
      await load()
    } catch {}
  }

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, IS_READ: 1 })))
      await load()
    } catch {}
  }

  const deleteNotification = async (id: number) => {
    try {
      setNotifications(prev => prev.filter(n => n.NOTIFICATION_ID !== id))
    } catch {}
  }

  const filtered = notifications.filter((n: any) => true)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications</p>
          </div>
        ) : (
          filtered.map((notif: any, i: number) => {
            const isRead = notif.IS_READ ?? notif.is_read
            const typeKey = (notif.NOTIFICATION_TYPE ?? notif.notification_type ?? 'info').toLowerCase()
            const Icon = iconMap[typeKey] || Info
            
            return (
              <motion.div
                key={notif.NOTIFICATION_ID ?? i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !isRead && markAsRead(notif.NOTIFICATION_ID ?? notif.notification_id)}
                className={cn(
                  'bg-card border border-border rounded-xl p-4 cursor-pointer transition-all',
                  !isRead && 'bg-teal-50 border-teal-200'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    typeKey === 'error' && 'bg-red-100 text-red-600',
                    typeKey === 'warning' && 'bg-amber-100 text-amber-600',
                    typeKey === 'info' && 'bg-blue-100 text-blue-600',
                    typeKey === 'success' && 'bg-emerald-100 text-emerald-600',
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold', !isRead && 'text-gray-900')}>
                      {notif.TITLE ?? notif.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.MESSAGE ?? notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notif.CREATED_AT ?? notif.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isRead && (
                      <div className="w-2 h-2 rounded-full bg-teal-600" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.NOTIFICATION_ID ?? notif.notification_id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
