'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const BRAND = '#005944';
export const BRAND_LIGHT = '#10b981';
export const GREY = '#e2e8f0';
export const AXIS = { fontSize: 11, fill: '#94a3b8', fontWeight: 500 };

/** Dark tooltip matching the dashboard HTML (#14171c) for recharts */
export function DarkTooltip({ active, payload, label, format }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[]; label?: ReactNode; format?: (v: number, key?: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-xl bg-tooltip p-2.5 text-white shadow-xl">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="mt-1 flex items-center justify-between gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-300"><span className="size-1.5 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="font-bold">{format ? format(Number(p.value), p.dataKey) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClass }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card', className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>{description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}</div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={cn('p-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function AlgoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-brand-900">{children}</div>;
}
