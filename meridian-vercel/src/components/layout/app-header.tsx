'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronRight, BookOpen01, Mail01, Bell01, ChevronSelectorVertical,
  PlusCircle, User01, Settings01, LogOut01, CheckDone01,
} from '@untitledui/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api, get } from '@/lib/api';
import { cn, initials, timeAgo } from '@/lib/utils';
import type { AppNotification, AuthUser } from '@/lib/types';
import { useCounts } from '@/store/counts';
import { PRIMARY_ACTION, ROLE_LABEL } from './nav-config';

const squareBtn = 'flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-800';
const iconBtn = 'relative flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

function HeaderIcon({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} aria-label={label} className={iconBtn}>{children}</Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function NotificationBell({ role }: { role: AuthUser['role'] }) {
  const { unread, refresh } = useCounts();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const router = useRouter();

  const load = async () => {
    try { setItems((await get<{ items: AppNotification[] }>('/notifications', { limit: 6 })).items); } catch { setItems([]); }
  };
  const open = async (n: AppNotification) => {
    if (!n.isRead) { await api.patch(`/notifications/${n._id}/read`).catch(() => {}); refresh(role); }
    router.push(n.link || '/dashboard/notifications');
  };
  const readAll = async () => { await api.patch('/notifications/read-all').catch(() => {}); refresh(role); load(); };

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} className={iconBtn}>
        <Bell01 className="size-4" />
        {unread > 0 && <span className="absolute top-2 right-2 size-1.5 rounded-full bg-emerald-500" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            <p className="text-[11px] text-slate-500">{unread ? `${unread} unread` : 'You are all caught up'}</p>
          </div>
          {unread > 0 && (
            <button onClick={readAll} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-900">
              <CheckDone01 className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {items === null && <p className="px-3 py-6 text-center text-xs text-slate-400">Loading…</p>}
          {items?.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No notifications yet</p>}
          {items?.map((n) => (
            <DropdownMenuItem key={n._id} onSelect={() => open(n)} className="items-start gap-3 py-2.5">
              <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', n.isRead ? 'bg-slate-200' : n.type === 'Stock' || n.type === 'Alert' ? 'bg-amber-500' : 'bg-emerald-500')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-900">{n.title}</span>
                <span className="line-clamp-2 block text-[11px] font-normal text-slate-500">{n.message}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{timeAgo(n.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <Link href="/dashboard/notifications" className="block px-4 py-2.5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">View all</Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({ user, title, onSignOut }: { user: AuthUser; title: string; onSignOut: () => void }) {
  const router = useRouter();
  const pathname = usePathname() ?? ''; // null-safe: a pages/ dir (the API bridge) widens the type
  const action = PRIMARY_ACTION[user.role];
  const [actionPath, actionQuery] = action.href.split('?');
  const runAction = (e: React.MouseEvent) => {
    if (pathname !== actionPath) return; // normal navigation
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('meridian:flag', { detail: actionQuery.split('=')[0] }));
  };
  const subtitle = user.role === 'doctor' ? user.profile?.specialization : user.role === 'supplier' ? 'Supply partner' : ROLE_LABEL[user.role];
  const guide = user.role === 'patient' ? '/dashboard/prescriptions' : user.role === 'supplier' ? '/dashboard/supply-orders' : '/dashboard/reports';
  const messages = user.role === 'patient' ? '/dashboard/appointments' : '/dashboard/requests';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/60 bg-white px-4 sm:px-6 lg:top-0 lg:px-8 max-lg:top-14">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex items-center gap-1.5">
          <button aria-label="Go back" onClick={() => router.back()} className={squareBtn}><ArrowLeft className="size-4" /></button>
          <button aria-label="Go forward" onClick={() => router.forward()} className={cn(squareBtn, 'text-slate-400')}><ArrowRight className="size-4" /></button>
        </div>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm text-slate-500 sm:flex">
          <Link href="/dashboard" className="truncate hover:text-slate-700">Meridian Central Hospital</Link>
          <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
          <span className="truncate font-semibold text-slate-900">{title}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1 sm:flex sm:gap-2">
          <HeaderIcon label={user.role === 'patient' ? 'My prescriptions' : 'Reports & protocols'} href={guide}><BookOpen01 className="size-4" /></HeaderIcon>
          <HeaderIcon label={user.role === 'patient' ? 'My appointments' : 'Requisitions'} href={messages}><Mail01 className="size-4" /></HeaderIcon>
        </div>
        <NotificationBell role={user.role} />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl border-l border-slate-200/80 py-1 pr-1 pl-2 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500/40">
            <Avatar><AvatarFallback>{initials(user.displayName)}</AvatarFallback></Avatar>
            <span className="hidden flex-col md:flex">
              <span className="max-w-36 truncate text-xs leading-tight font-bold text-slate-900">{user.displayName}</span>
              <span className="max-w-36 truncate text-[10px] font-medium text-slate-500">{subtitle}</span>
            </span>
            <ChevronSelectorVertical className="size-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-bold text-slate-900">{user.displayName}</span>
              <span className="block truncate font-normal">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}><User01 /> My profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/dashboard/settings#password')}><Settings01 /> Change password</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onSignOut}><LogOut01 /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href={action.href} onClick={runAction} className="ml-1 hidden items-center gap-2 rounded-xl bg-brand-800 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brand-900 sm:flex">
          <span>{action.label}</span>
          <PlusCircle className="size-3.5" />
        </Link>
      </div>
    </header>
  );
}
