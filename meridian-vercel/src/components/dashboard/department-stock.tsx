'use client';
import Link from 'next/link';
import { Plus, HeartRounded, Scissors01, Beaker02, DotsVertical } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatNumber, cn } from '@/lib/utils';
import { Pill } from '@/components/icons/pill';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from './states';
import type { Icon } from '@/components/layout/nav-config';

interface CategoryTotal { category: string; items: number; units: number; value: number; low: number }

/** Category groups shown as the four "Department Stock" tiles */
const GROUPS: { name: string; icon: Icon; tone: string; categories: string[]; note: string }[] = [
  { name: 'ICU & Trauma', icon: HeartRounded, tone: 'bg-red-100 text-red-600 border-red-200', categories: ['Antibiotics', 'Cardiovascular'], note: 'Antibiotics & cardiac' },
  { name: 'Surgery (OR)', icon: Scissors01, tone: 'bg-blue-100 text-blue-600 border-blue-200', categories: ['Anaesthetics', 'Surgical Supplies'], note: 'Sutures & anaesthetics' },
  { name: 'Pharmacy', icon: Pill, tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', categories: ['Analgesics', 'Antidiabetic', 'Gastrointestinal', 'Respiratory', 'Antihistamine', 'Vitamins', 'Dermatology'], note: 'Outpatient dispensary' },
  { name: 'Pathology', icon: Beaker02, tone: 'bg-purple-100 text-purple-600 border-purple-200', categories: ['Diagnostics'], note: 'Reagents & testing kits' },
];

export function DepartmentStock({ className }: { className?: string }) {
  const { data, loading, error, reload } = useApi(() => get<CategoryTotal[]>('/medicines/categories'), []);

  const tiles = GROUPS.map((g) => {
    const rows = (data ?? []).filter((c) => g.categories.includes(c.category));
    return { ...g, units: rows.reduce((s, r) => s + r.units, 0), items: rows.reduce((s, r) => s + r.items, 0), low: rows.reduce((s, r) => s + r.low, 0) };
  });
  const totalItems = tiles.reduce((s, t) => s + t.items, 0);
  const healthy = totalItems ? (((totalItems - tiles.reduce((s, t) => s + t.low, 0)) / totalItems) * 100).toFixed(1) : '0';

  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card', className)}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Department Stock</h2>
          <p className="mt-0.5 text-xs text-slate-500">{loading ? 'Calculating…' : `Capacity: ${healthy}% above reorder level`}</p>
        </div>
        <Link href="/dashboard/medicines?new=1" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50">
          <Plus className="size-3.5" /> Add item
        </Link>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {tiles.map((t) => {
            const TileIcon = t.icon;
            return (
              <Link key={t.name} href={`/dashboard/medicines?category=${encodeURIComponent(t.categories[0])}`} className="rounded-xl border border-slate-200/70 bg-[#fafbfc] p-3.5 transition hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex size-6 items-center justify-center rounded-full border shadow-xs', t.tone)}><TileIcon className="size-3.5" /></div>
                    <span className="text-xs font-bold text-slate-900">{t.name}</span>
                  </div>
                  <DotsVertical className="size-3.5 text-slate-400" />
                </div>
                <div className="mt-3">
                  {loading ? <Skeleton className="h-5 w-24" /> : <p className="text-base font-extrabold text-slate-900">{formatNumber(t.units)} Units</p>}
                  <p className="mt-0.5 text-[11px] text-slate-400">{t.note} · {t.items} SKUs</p>
                </div>
                <div className="mt-3">
                  <span className={cn('inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold [&>svg]:size-3', t.low ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{loading ? '—' : t.low ? `${t.low} Low` : 'Optimal'}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
