'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Bell01, CheckDone01, AlertTriangle, InfoCircle, CheckCircle, Calendar, Package } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import type { AppNotification } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { Icon } from '@/components/layout/nav-config';

const META: Record<AppNotification['type'], { icon: Icon; tone: string }> = {
  Info: { icon: InfoCircle, tone: 'bg-sky-50 text-sky-700 border-sky-200/60' },
  Warning: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  Alert: { icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700 border-rose-200/60' },
  Success: { icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Appointment: { icon: Calendar, tone: 'bg-purple-50 text-purple-700 border-purple-200/60' },
  Stock: { icon: Package, tone: 'bg-amber-50 text-amber-700 border-amber-200/60' },
};

export default function NotificationsPage() {
  const role = useAuth((s) => s.user!.role);
  const refreshCounts = useCounts((s) => s.refresh);
  const [filter, setFilter] = useState('all');
  const { data, loading, error, reload, setData } = useApi(() => get<{ items: AppNotification[]; unread: number }>('/notifications', { limit: 100, unread: filter === 'unread' ? 'true' : undefined }), [filter]);

  const markRead = async (n: AppNotification) => {
    if (n.isRead) return;
    await api.patch(`/notifications/${n._id}/read`).catch(() => {});
    setData((d) => d && ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)) }));
    refreshCounts(role);
  };
  const readAll = async () => { await api.patch('/notifications/read-all').catch(() => {}); reload(); refreshCounts(role); };

  return (
    <>
      <PageHeader title="Notifications" description="Alerts raised by triggers and actions across Meridian"
        actions={<Button variant="outline" disabled={!data?.unread} onClick={readAll}><CheckDone01 /> Mark all read</Button>} />
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <Tabs value={filter} onValueChange={setFilter}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread{data?.unread ? ` (${data.unread})` : ''}</TabsTrigger></TabsList></Tabs>
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? <EmptyState icon={Bell01} title="Nothing here" description="You're all caught up." /> : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((n) => {
              const m = META[n.type] ?? META.Info;
              const IconCmp = m.icon;
              return (
                <li key={n._id} className={cn('flex items-start gap-4 px-5 py-4 transition', !n.isRead && 'bg-brand-50/30')}>
                  <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl border', m.tone)}><IconCmp className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{n.title}</p>
                      {!n.isRead && <span className="size-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400" title={formatDate(n.createdAt, 'dd MMM yyyy, HH:mm')}>{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {n.link && <Button size="sm" variant="outline" asChild><Link href={n.link} onClick={() => markRead(n)}>Open</Link></Button>}
                    {!n.isRead && <Button size="sm" variant="ghost" onClick={() => markRead(n)}>Mark read</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
