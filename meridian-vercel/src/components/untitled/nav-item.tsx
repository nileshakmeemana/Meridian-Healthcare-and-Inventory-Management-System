'use client';
/**
 * Adapted from Untitled UI React — app-navigation/base-components/nav-item.tsx (MIT).
 * Same react-aria Link + aria-current behaviour, restyled with the Meridian
 * dashboard look: dark #1e2329 active pill, slate hover and count badges.
 */
import type { MouseEventHandler, ReactNode } from 'react';
import { Link as AriaLink } from 'react-aria-components';
import { cn } from '@/lib/utils';
import type { Icon, NavBadge } from '@/components/layout/nav-config';

const BADGE_TONES: Record<NavBadge['tone'], string> = {
  gray: 'bg-slate-100 text-slate-600 border-slate-200/60',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
  brand: 'bg-brand-50 text-brand-800 border-brand-100',
};

interface NavItemBaseProps {
  href?: string;
  icon?: Icon;
  badge?: NavBadge | null;
  current?: boolean;
  danger?: boolean;
  onClick?: MouseEventHandler;
  onPress?: () => void;
  children: ReactNode;
}

export function NavItemBase({ href, icon: IconCmp, badge, current, danger, onClick, onPress, children }: NavItemBaseProps) {
  return (
    <AriaLink
      href={href}
      onPress={onPress}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'group/item flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all outline-none select-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500/40',
        current ? 'bg-ink text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
        danger && !current && 'hover:bg-red-50 hover:text-red-600'
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        {IconCmp && (
          <IconCmp
            aria-hidden="true"
            className={cn('size-4 shrink-0', current ? 'text-white' : 'text-slate-500', danger && 'group-hover/item:text-red-500')}
          />
        )}
        <span className="truncate">{children}</span>
      </span>
      {badge && (
        <span className={cn('inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold [&>svg]:size-3', current ? 'border-white/30 bg-ink text-white' : BADGE_TONES[badge.tone])}>
          {badge.label}
        </span>
      )}
    </AriaLink>
  );
}
