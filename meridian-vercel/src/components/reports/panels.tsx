'use client';
import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LineChart, Line,
} from 'recharts';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { cn, formatDate, formatLKR, formatNumber, toISODate } from '@/lib/utils';
import { StatTile } from '@/components/dashboard/metric-card';
import { ErrorState, TableSkeleton, EmptyState } from '@/components/dashboard/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BankNote02, Receipt, Users01, TrendUp01, TrendDown01, Minus, Trophy01, Package, AlertTriangle } from '@untitledui/icons';
import { AXIS, BRAND, BRAND_LIGHT, DarkTooltip, Panel, AlgoNote } from './chart-kit';

/* ------------------------------ Revenue ------------------------------ */
interface RevenueDay { saleDay: string; totalRevenue: number; totalTransactions: number; uniquePatients: number; unitsDispensed: number }
export function RevenuePanel() {
  const [days, setDays] = useState('30');
  const { data, loading, error, reload } = useApi(() => get<{ total: number; series: RevenueDay[] }>('/reports/revenue', { days }), [days]);
  const s = data?.series ?? [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={BankNote02} tone="amber" label={`Revenue · ${days} days`} value={formatLKR(data?.total, { compact: true })} hint="fn_get_total_revenue" />
        <StatTile icon={Receipt} tone="blue" label="Transactions" value={formatNumber(s.reduce((t, d) => t + d.totalTransactions, 0))} hint="vw_daily_revenue_summary" />
        <StatTile icon={Package} tone="slate" label="Units dispensed" value={formatNumber(s.reduce((t, d) => t + d.unitsDispensed, 0))} />
      </div>
      <Panel title="Daily revenue" description="From the vw_daily_revenue_summary view"
        actions={<Tabs value={days} onValueChange={setDays}><TabsList>{['7', '30', '90', '180'].map((d) => <TabsTrigger key={d} value={d}>{d}d</TabsTrigger>)}</TabsList></Tabs>}>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <Skeleton className="h-72 w-full" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="saleDay" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d) => formatDate(d, 'dd MMM')} minTickGap={24} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={48} />
                <Tooltip content={<DarkTooltip format={(v, k) => (k === 'totalRevenue' ? formatLKR(v) : formatNumber(v))} />} labelFormatter={(d) => formatDate(String(d), 'EEE, dd MMM yyyy')} />
                <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke={BRAND} strokeWidth={2} fill={BRAND_LIGHT} fillOpacity={0.28} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------- Appointments --------------------------- */
interface ApptMonth { month: string; label: string; total: number; completed: number; cancelled: number; noShow: number; scheduled: number }
export function AppointmentsPanel() {
  const { data, loading, error, reload } = useApi(() => get<ApptMonth[]>('/reports/appointments'), []);
  const daily = useApi(() => get<{ day: string; patients: number; visits: number }[]>('/reports/daily-patients', { days: 30 }), []);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel title="Appointments by month" description="Completed, cancelled and no-show over the last six months">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <Skeleton className="h-72 w-full" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data ?? []} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<DarkTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill={BRAND} />
                <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="#38bdf8" />
                <Bar dataKey="noShow" name="No-show" stackId="a" fill="#cbd5e1" />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#fda4af" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel title="Daily patient flow" description="Distinct patients seen per day · last 30 days">
        {daily.loading ? <Skeleton className="h-72 w-full" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily.data ?? []} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d) => formatDate(d, 'dd')} minTickGap={16} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} labelFormatter={(d) => formatDate(String(d), 'EEE, dd MMM')} />
                <Line type="monotone" dataKey="patients" name="Patients" stroke={BRAND} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visits" name="Appointments" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------ Most used (wow factor) ---------------------- */
interface MostUsed { medicineId: string; rankPosition: number; medicineName: string; category: string; unitPrice: number; stockQuantity: number; reorderLevel: number; totalUnitsSold: number; totalRevenue: number; uniquePatients: number; numberOfTransactions: number; avgQtyPerTransaction: number }
export function MostUsedPanel() {
  const [start, setStart] = useState(toISODate(new Date(Date.now() - 90 * 864e5)));
  const [end, setEnd] = useState(toISODate());
  const [topN, setTopN] = useState('10');
  const { data, loading, error, reload } = useApi(() => get<MostUsed[]>('/reports/most-used', { topN, startDate: start, endDate: end }), [start, end, topN]);
  const leader = data?.[0];

  return (
    <div className="space-y-6">
      <Panel title="Most used medicines" description="sp_get_most_used_medicines — ranked with RANK() over units dispensed ($setWindowFields + $rank)"
        actions={<>
          <Input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="w-40 text-xs" aria-label="Start date" />
          <span className="text-xs text-slate-400">to</span>
          <Input type="date" value={end} min={start} max={toISODate()} onChange={(e) => setEnd(e.target.value)} className="w-40 text-xs" aria-label="End date" />
          <Select value={topN} onValueChange={setTopN}><SelectTrigger className="w-28 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{['5', '10', '15', '20'].map((n) => <SelectItem key={n} value={n}>Top {n}</SelectItem>)}</SelectContent></Select>
        </>}>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <Skeleton className="h-80 w-full" /> : !data?.length ? <EmptyState title="No sales in this window" /> : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="balance-card-bg relative overflow-hidden rounded-2xl p-5 text-white lg:col-span-4">
              <div className="relative z-10">
                <div className="flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/15"><Trophy01 className="size-5" /></div>
                <p className="mt-4 text-xs text-emerald-100/80">#1 in this period</p>
                <h3 className="mt-0.5 text-2xl font-extrabold tracking-tight">{leader!.medicineName}</h3>
                <p className="text-xs text-emerald-100/80">{leader!.category}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
                  <div><p className="text-xl font-extrabold">{formatNumber(leader!.totalUnitsSold)}</p><p className="text-[11px] text-emerald-100/80">units</p></div>
                  <div><p className="text-xl font-extrabold">{formatLKR(leader!.totalRevenue, { compact: true })}</p><p className="text-[11px] text-emerald-100/80">revenue</p></div>
                  <div><p className="text-xl font-extrabold">{leader!.uniquePatients}</p><p className="text-[11px] text-emerald-100/80">patients</p></div>
                  <div><p className="text-xl font-extrabold">{leader!.numberOfTransactions}</p><p className="text-[11px] text-emerald-100/80">sales</p></div>
                </div>
              </div>
            </div>
            <div className="h-80 lg:col-span-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} />
                  <YAxis type="category" dataKey="medicineName" tick={{ ...AXIS, fill: '#475569' }} tickLine={false} axisLine={false} width={150} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<DarkTooltip format={(v) => `${formatNumber(v)} units`} />} />
                  <Bar dataKey="totalUnitsSold" name="Units dispensed" radius={[0, 8, 8, 0]} barSize={16}>
                    {data.map((d, i) => <Cell key={d.medicineId} fill={i === 0 ? BRAND : i < 3 ? BRAND_LIGHT : '#cbd5e1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Panel>
      {data && data.length > 0 && (
        <Panel title="Ranking detail" bodyClass="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Medicine</TableHead><TableHead>Units</TableHead><TableHead>Revenue</TableHead><TableHead>Patients</TableHead><TableHead>Avg / sale</TableHead><TableHead>Stock now</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.medicineId}>
                  <TableCell><span className={cn('inline-flex size-7 items-center justify-center rounded-lg text-xs font-extrabold', m.rankPosition === 1 ? 'bg-brand-800 text-white' : m.rankPosition <= 3 ? 'bg-brand-50 text-brand-800' : 'bg-slate-100 text-slate-600')}>{m.rankPosition}</span></TableCell>
                  <TableCell><p className="font-bold text-slate-900">{m.medicineName}</p><p className="text-[10px] text-slate-400">{m.category}</p></TableCell>
                  <TableCell className="font-bold text-slate-900">{formatNumber(m.totalUnitsSold)}</TableCell>
                  <TableCell>{formatLKR(m.totalRevenue)}</TableCell>
                  <TableCell>{m.uniquePatients}</TableCell>
                  <TableCell>{m.avgQtyPerTransaction}</TableCell>
                  <TableCell className={m.stockQuantity <= m.reorderLevel ? 'font-bold text-amber-600' : ''}>{formatNumber(m.stockQuantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}

/* --------------------------- Demand forecast -------------------------- */
interface Forecast { medicineId: string; medicineName: string; category: string; unit: string; stockQuantity: number; history: number[]; months: string[]; forecastNextMonth: number; trend: 'Rising' | 'Falling' | 'Stable'; slope: number; confidence: number; daysToStockout: number | null; suggestedOrder: number; risk: 'High' | 'Medium' | 'Low' | 'None' }
const RISK_VARIANT = { High: 'error', Medium: 'warning', Low: 'success', None: 'gray' } as const;

function Sparkline({ values, forecast }: { values: number[]; forecast: number }) {
  const all = [...values, forecast];
  const max = Math.max(...all, 1);
  const w = 96; const h = 28; const step = w / (all.length - 1);
  const pt = (v: number, i: number) => `${i * step},${h - (v / max) * (h - 4) - 2}`;
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <polyline points={values.map(pt).join(' ')} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      <polyline points={`${pt(values[values.length - 1], values.length - 1)} ${pt(forecast, all.length - 1)}`} fill="none" stroke={BRAND_LIGHT} strokeWidth="2" strokeDasharray="3 2" />
      <circle cx={(all.length - 1) * step} cy={h - (forecast / max) * (h - 4) - 2} r="2.5" fill={BRAND} />
    </svg>
  );
}

export function ForecastPanel() {
  const { data, loading, error, reload } = useApi(() => get<Forecast[]>('/reports/forecast', { months: 6, limit: 20 }), []);
  const high = (data ?? []).filter((f) => f.risk === 'High').length;
  return (
    <div className="space-y-6">
      <AlgoNote>
        <b>Algorithm — Ordinary Least Squares regression.</b> For each medicine we aggregate units dispensed per month for the last six months,
        fit <span className="font-mono">y = a + b·x</span>, and project month seven. Daily demand = forecast ÷ 30; days-to-stockout = stock ÷ daily demand;
        suggested order = forecast + 7 days safety stock − current stock. Confidence is the fit&apos;s R².
      </AlgoNote>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={AlertTriangle} tone="rose" label="High stock-out risk" value={high} hint="≤ 14 days of cover" />
        <StatTile icon={TrendUp01} tone="amber" label="Rising demand" value={(data ?? []).filter((f) => f.trend === 'Rising').length} />
        <StatTile icon={Package} tone="blue" label="Units to reorder" value={formatNumber((data ?? []).reduce((s, f) => s + f.suggestedOrder, 0))} />
      </div>
      <Panel title="Demand forecast & reorder plan" description="Sorted by risk, then days to stock-out" bodyClass="p-0">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.length ? <EmptyState title="Not enough sales history" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Medicine</TableHead><TableHead>6-month trend</TableHead><TableHead>Forecast</TableHead><TableHead>Confidence</TableHead><TableHead>In stock</TableHead><TableHead>Days left</TableHead><TableHead>Suggested order</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((f) => {
                const TrendIcon = f.trend === 'Rising' ? TrendUp01 : f.trend === 'Falling' ? TrendDown01 : Minus;
                return (
                  <TableRow key={f.medicineId}>
                    <TableCell><p className="font-bold text-slate-900">{f.medicineName}</p><p className="text-[10px] text-slate-400">{f.category}</p></TableCell>
                    <TableCell><div className="flex items-center gap-3"><Sparkline values={f.history} forecast={f.forecastNextMonth} /><span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', f.trend === 'Rising' ? 'text-amber-600' : f.trend === 'Falling' ? 'text-sky-600' : 'text-slate-500')}><TrendIcon className="size-3.5" />{f.trend}</span></div></TableCell>
                    <TableCell className="font-bold text-slate-900">{formatNumber(f.forecastNextMonth)} <span className="text-[10px] font-medium text-slate-400">{f.unit}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2"><div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${f.confidence * 100}%` }} /></div><span className="text-[11px]">{Math.round(f.confidence * 100)}%</span></div>
                    </TableCell>
                    <TableCell>{formatNumber(f.stockQuantity)}</TableCell>
                    <TableCell className={cn('font-bold', f.risk === 'High' ? 'text-rose-600' : f.risk === 'Medium' ? 'text-amber-600' : 'text-slate-700')}>{f.daysToStockout ?? '∞'}</TableCell>
                    <TableCell className="font-bold text-slate-900">{f.suggestedOrder ? formatNumber(f.suggestedOrder) : '—'}</TableCell>
                    <TableCell><Badge variant={RISK_VARIANT[f.risk]}>{f.risk}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------- Market basket --------------------------- */
interface Rule { antecedent: string; consequent: string; coOccurrences: number; support: number; confidence: number; lift: number }
export function BasketPanel() {
  const [minSupport, setMinSupport] = useState('0.02');
  const [minConfidence, setMinConfidence] = useState('0.2');
  const { data, loading, error, reload } = useApi(() => get<{ transactions: number; rules: Rule[] }>('/reports/basket', { minSupport, minConfidence }), [minSupport, minConfidence]);
  const maxLift = Math.max(...(data?.rules ?? []).map((r) => r.lift), 1);
  return (
    <div className="space-y-6">
      <AlgoNote>
        <b>Algorithm — Apriori association-rule mining.</b> Each prescription is a basket. Pass 1 keeps medicines whose support ≥ the threshold;
        pass 2 counts only pairs built from those frequent items (the Apriori property). For a rule A → B: support = P(A∩B), confidence = P(B|A),
        lift = confidence ÷ P(B). Lift above 1 means doctors prescribe them together more than chance.
      </AlgoNote>
      <Panel title="Co-prescription rules" description={data ? `${formatNumber(data.transactions)} prescriptions analysed` : 'Mining…'} bodyClass="p-0"
        actions={<>
          <Select value={minSupport} onValueChange={setMinSupport}><SelectTrigger className="w-36 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{['0.01', '0.02', '0.05', '0.1'].map((v) => <SelectItem key={v} value={v}>Support ≥ {Number(v) * 100}%</SelectItem>)}</SelectContent></Select>
          <Select value={minConfidence} onValueChange={setMinConfidence}><SelectTrigger className="w-40 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{['0.1', '0.2', '0.4', '0.6'].map((v) => <SelectItem key={v} value={v}>Confidence ≥ {Number(v) * 100}%</SelectItem>)}</SelectContent></Select>
        </>}>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.rules.length ? <EmptyState title="No rules at these thresholds" description="Lower the support or confidence." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>If prescribed…</TableHead><TableHead /><TableHead>…also prescribed</TableHead><TableHead>Together</TableHead><TableHead>Support</TableHead><TableHead>Confidence</TableHead><TableHead>Lift</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.rules.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold text-slate-900">{r.antecedent}</TableCell>
                  <TableCell className="text-slate-300">→</TableCell>
                  <TableCell className="font-bold text-brand-800">{r.consequent}</TableCell>
                  <TableCell>{r.coOccurrences}×</TableCell>
                  <TableCell>{r.support}%</TableCell>
                  <TableCell>{r.confidence}%</TableCell>
                  <TableCell><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-700" style={{ width: `${(r.lift / maxLift) * 100}%` }} /></div><span className="font-bold text-slate-900">{r.lift}</span></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------ ABC analysis -------------------------- */
interface Abc { totalRevenue: number; summary: { abcClass: 'A' | 'B' | 'C'; items: number; revenue: number }[]; items: { medicineId: string; medicineName: string; category: string; revenue: number; units: number; sharePct: number; cumulativePct: number; abcClass: 'A' | 'B' | 'C' }[] }
const ABC_TONE = { A: 'bg-brand-800 text-white', B: 'bg-amber-100 text-amber-800', C: 'bg-slate-100 text-slate-600' };
const ABC_FILL = { A: BRAND, B: '#f59e0b', C: '#cbd5e1' };
export function AbcPanel() {
  const [days, setDays] = useState('180');
  const { data, loading, error, reload } = useApi(() => get<Abc>('/reports/abc', { days }), [days]);
  return (
    <div className="space-y-6">
      <AlgoNote>
        <b>Algorithm — ABC (Pareto) classification.</b> Medicines are sorted by revenue and the cumulative share is computed.
        Class A items make up the first 80% of revenue (tight control, frequent review), B the next 15%, and C the final 5%.
      </AlgoNote>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(data?.summary ?? [{ abcClass: 'A', items: 0, revenue: 0 }, { abcClass: 'B', items: 0, revenue: 0 }, { abcClass: 'C', items: 0, revenue: 0 }] as Abc['summary']).map((s) => (
          <div key={s.abcClass} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
            <span className={cn('flex size-11 items-center justify-center rounded-xl text-lg font-extrabold', ABC_TONE[s.abcClass])}>{s.abcClass}</span>
            <div><p className="text-xl font-extrabold text-slate-900">{s.items} items</p><p className="text-xs text-slate-500">{formatLKR(s.revenue, { compact: true })} · {data ? ((s.revenue / (data.totalRevenue || 1)) * 100).toFixed(1) : 0}% of revenue</p></div>
          </div>
        ))}
      </div>
      <Panel title="Pareto curve" description="Revenue per medicine with cumulative share"
        actions={<Tabs value={days} onValueChange={setDays}><TabsList>{['90', '180', '365'].map((d) => <TabsTrigger key={d} value={d}>{d}d</TabsTrigger>)}</TabsList></Tabs>}>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <Skeleton className="h-72 w-full" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.items ?? []} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="medicineName" tick={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={48} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<DarkTooltip format={(v, k) => (k === 'revenue' ? formatLKR(v) : `${v}%`)} />} />
                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                  {(data?.items ?? []).map((d) => <Cell key={d.medicineId} fill={ABC_FILL[d.abcClass]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      {data && (
        <Panel title="Classification" bodyClass="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Medicine</TableHead><TableHead>Units</TableHead><TableHead>Revenue</TableHead><TableHead>Share</TableHead><TableHead>Cumulative</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.items.map((m) => (
                  <TableRow key={m.medicineId}>
                    <TableCell><span className={cn('inline-flex size-7 items-center justify-center rounded-lg text-xs font-extrabold', ABC_TONE[m.abcClass])}>{m.abcClass}</span></TableCell>
                    <TableCell><p className="font-bold text-slate-900">{m.medicineName}</p><p className="text-[10px] text-slate-400">{m.category}</p></TableCell>
                    <TableCell>{formatNumber(m.units)}</TableCell>
                    <TableCell className="font-bold text-slate-900">{formatLKR(m.revenue)}</TableCell>
                    <TableCell>{m.sharePct}%</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${m.cumulativePct}%`, background: ABC_FILL[m.abcClass] }} /></div><span className="text-[11px]">{m.cumulativePct}%</span></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* -------------------------- Supplier performance ---------------------- */
interface SupplierPerf { _id: string; companyName: string; rating: number; totalOrders: number; deliveredOrders: number; totalUnitsSupplied: number; totalValueSupplied: number; deliveryRatePct: number | null; lastSupplyDate?: string }
export function SuppliersPanel() {
  const { data, loading, error, reload } = useApi(() => get<SupplierPerf[]>('/reports/suppliers'), []);
  return (
    <div className="space-y-6">
      <Panel title="Supplier performance" description="vw_supplier_performance — volume, value and delivery reliability">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <Skeleton className="h-72 w-full" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data ?? []} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="companyName" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, true)} width={48} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<DarkTooltip format={(v) => formatNumber(v)} />} />
                <Bar dataKey="totalUnitsSupplied" name="Units supplied" fill={BRAND} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      {data && (
        <Panel title="League table" bodyClass="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Orders</TableHead><TableHead>Delivered</TableHead><TableHead>Delivery rate</TableHead><TableHead>Units</TableHead><TableHead>Value</TableHead><TableHead>Last supply</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s._id}>
                  <TableCell><p className="font-bold text-slate-900">{s.companyName}</p><p className="text-[10px] text-slate-400">Rating {s.rating?.toFixed?.(1) ?? s.rating}</p></TableCell>
                  <TableCell>{s.totalOrders}</TableCell>
                  <TableCell>{s.deliveredOrders}</TableCell>
                  <TableCell><Badge variant={(s.deliveryRatePct ?? 0) >= 90 ? 'success' : (s.deliveryRatePct ?? 0) >= 70 ? 'warning' : 'error'}>{s.deliveryRatePct ?? '—'}%</Badge></TableCell>
                  <TableCell className="font-bold text-slate-900">{formatNumber(s.totalUnitsSupplied)}</TableCell>
                  <TableCell>{formatLKR(s.totalValueSupplied)}</TableCell>
                  <TableCell>{formatDate(s.lastSupplyDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}

export { Users01 };
