'use client';
import { useState } from 'react';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart } from './bar-chart';
import { ErrorState } from './states';

interface Consumption { period: string; total: number; series: { key: string; label: string; cycle: string; dispensed: number; intake: number }[] }

export function ConsumptionCard({ className }: { className?: string }) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { data, loading, error, reload } = useApi(() => get<Consumption>('/reports/consumption', { period }), [period]);

  return (
    <div className={`flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card ${className ?? ''}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium text-slate-500">{period === 'monthly' ? 'Monthly' : 'Yearly'} Supply Consumption</p>
          {loading ? <Skeleton className="mt-1 h-8 w-44" /> : <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{formatNumber(data?.total)} Units</h2>}
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            {(['monthly', 'yearly'] as const).map((p) => (
              <TabsTrigger key={p} value={p} className="capitalize">
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <Skeleton className="mt-6 h-64 w-full" /> : (
        <div className="min-h-0 flex-1 pt-8">
          <BarChart
            fillHeight
            data={data.series.map((s) => ({
              label: s.label, value: s.dispensed, caption: `Batch Cycle: ${s.cycle}`,
              rows: [{ label: 'Intake Restock', value: `+${formatNumber(s.intake)}`, accent: true }],
            }))}
          />
        </div>
      )}
    </div>
  );
}
