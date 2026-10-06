'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from '@untitledui/icons';
import { cn } from '@/lib/utils';
import type { Icon } from '@/components/layout/nav-config';
import { Skeleton } from '@/components/ui/skeleton';

type Tone = 'brand' | 'amber' | 'slate' | 'rose' | 'blue' | 'purple';

const TILE: Record<Exclude<Tone, 'brand'>, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
  slate: 'bg-slate-100 text-slate-700 border-slate-200/60',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
  blue: 'bg-sky-50 text-sky-700 border-sky-200/60',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
};
const BADGE: Record<'amber' | 'emerald' | 'rose' | 'slate' | 'blue', string> = {
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
  rose: 'text-rose-700',
  slate: 'text-slate-600',
  blue: 'text-sky-700',
};

interface MetricCardProps {
  tone?: Tone;
  icon: Icon;
  title: string;
  subtitle?: ReactNode;
  value: ReactNode;
  badge?: { label: ReactNode; tone?: keyof typeof BADGE };
  footer?: { label: string; href: string };
  loading?: boolean;
  index?: number;
}

/** The three top cards from the dashboard HTML — `tone="brand"` is the green balance card */
export function MetricCard({ tone = 'slate', icon: IconCmp, title, subtitle, value, badge, footer, loading, index = 0 }: MetricCardProps) {
  const brand = tone === 'brand';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-card',
        brand ? 'balance-card-bg text-white' : 'border border-slate-200/80 bg-white'
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', brand ? 'border-white/20 bg-brand-700 text-white' : TILE[tone as Exclude<Tone, 'brand'>])}>
            <IconCmp className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className={cn('text-base font-bold', brand ? 'text-white' : 'text-slate-900')}>{title}</h3>
            {subtitle && <p className={cn('truncate text-xs', brand ? 'text-emerald-100/80' : 'text-slate-500')}>{subtitle}</p>}
          </div>
        </div>
        <div className="mt-6">
          {loading ? (
            <Skeleton className={cn('h-9 w-40', brand && 'bg-white/20')} />
          ) : (
            <span className={cn('text-3xl font-extrabold tracking-tight', !brand && 'text-slate-900')}>{value}</span>
          )}
          {badge && !loading && (
            <span className={cn('mt-1 block text-xs font-semibold', brand ? 'text-emerald-100' : BADGE[badge.tone ?? 'slate'])}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
      {footer && (
        <Link href={footer.href} className={cn('group relative z-10 mt-6 flex items-center justify-between border-t pt-4', brand ? 'border-white/15' : 'border-slate-100')}>
          <span className={cn('text-xs font-medium', brand ? 'text-emerald-100' : 'text-slate-600 group-hover:text-slate-900')}>{footer.label}</span>
          <ArrowRight className={cn('size-4 transition-transform group-hover:translate-x-0.5', brand ? 'text-emerald-200' : 'text-slate-400')} />
        </Link>
      )}
    </motion.div>
  );
}

/** Compact KPI used in secondary rows */
export function StatTile({ icon: IconCmp, label, value, hint, tone = 'slate' }: { icon: Icon; label: string; value: ReactNode; hint?: ReactNode; tone?: Exclude<Tone, 'brand'> }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', TILE[tone])}><IconCmp className="size-5" /></div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="truncate text-[11px] text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
