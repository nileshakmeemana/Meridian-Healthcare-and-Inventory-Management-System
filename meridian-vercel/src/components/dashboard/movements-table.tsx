'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DotsHorizontal, FilterLines, ArrowCircleDown, ArrowCircleUp, Truck01, SwitchHorizontal01, Edit05 } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatDate, formatNumber, cn, timeAgo } from '@/lib/utils';
import type { StockMovement } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pill } from '@/components/icons/pill';
import { SearchInput } from './search-input';
import { StatusDot } from './status-dot';
import { EmptyState, ErrorState, TableSkeleton } from './states';
import type { Icon } from '@/components/layout/nav-config';

const TYPE_META: Record<StockMovement['changeType'], { label: string; icon: Icon; tone: string }> = {
  Sale: { label: 'Dispensed', icon: SwitchHorizontal01, tone: 'bg-emerald-100 text-emerald-700' },
  Supply: { label: 'Supplier intake', icon: Truck01, tone: 'bg-blue-100 text-blue-600' },
  Add: { label: 'Stock added', icon: ArrowCircleUp, tone: 'bg-brand-50 text-brand-700' },
  Remove: { label: 'Stock removed', icon: ArrowCircleDown, tone: 'bg-rose-100 text-rose-600' },
  Adjust: { label: 'Adjusted', icon: Edit05, tone: 'bg-slate-100 text-slate-700' },
};

function stockStatus(m?: StockMovement['medicine']) {
  if (!m) return { tone: 'slate' as const, label: '—' };
  if (m.expiryDate && new Date(m.expiryDate) < new Date()) return { tone: 'rose' as const, label: 'Expired' };
  if (m.stockQuantity <= 0) return { tone: 'rose' as const, label: 'Out of Stock' };
  if (m.stockQuantity <= m.reorderLevel) return { tone: 'amber' as const, label: 'Reorder Level' };
  return { tone: 'emerald' as const, label: 'In Stock' };
}

/** "Recent Dispensary & Requisition Logs" — reads stock_history written by the stock trigger */
export function MovementsTable() {
  const { data, loading, error, reload } = useApi(() => get<StockMovement[]>('/medicines/movements', { limit: 40 }), []);
  const [q, setQ] = useState('');
  const [type, setType] = useState<StockMovement['changeType'] | 'All'>('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => (data ?? []).filter((r) => {
    const hay = `${r.medicine?.name} ${r.medicine?.sku} ${r.medicine?.batchNumber} ${r.reason}`.toLowerCase();
    return (type === 'All' || r.changeType === type) && hay.includes(q.toLowerCase());
  }), [data, q, type]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r._id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Dispensary & Requisition Logs</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {selected.size ? `${selected.size} selected · ` : ''}Real-time batch allocations written by the stock-history trigger
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Filter by drug, SKU, batch..." className="w-48 sm:w-auto" />
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50">
              <span>{type === 'All' ? 'Filter type' : TYPE_META[type].label}</span>
              <FilterLines className="size-3.5 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Movement type</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setType('All')}>All movements</DropdownMenuItem>
              <DropdownMenuSeparator />
              {(Object.keys(TYPE_META) as StockMovement['changeType'][]).map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setType(t)}>{TYPE_META[t].label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : rows.length === 0 ? (
        <EmptyState title="No matching movements" description="Try another drug name, SKU or batch number." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pr-3"><Checkbox checked={allChecked ? true : selected.size ? 'indeterminate' : false} onCheckedChange={toggleAll} aria-label="Select all rows" /></TableHead>
              <TableHead>Medical Item / Drug</TableHead>
              <TableHead>Batch ID</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Movement</TableHead>
              <TableHead>Unit Qty</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const meta = TYPE_META[r.changeType];
              const MetaIcon = r.changeType === 'Sale' ? Pill : meta.icon;
              const st = stockStatus(r.medicine);
              return (
                <TableRow key={r._id} data-state={selected.has(r._id) ? 'selected' : undefined}>
                  <TableCell className="pr-3"><Checkbox checked={selected.has(r._id)} onCheckedChange={() => toggle(r._id)} aria-label={`Select ${r.medicine?.name}`} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', meta.tone)}><MetaIcon className="size-3.5" /></div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{r.medicine?.name ?? 'Deleted item'}</p>
                        <p className="text-[10px] text-slate-400">{r.medicine?.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-600">{r.medicine?.batchNumber ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{formatDate(r.medicine?.expiryDate)}</TableCell>
                  <TableCell className="text-slate-600">
                    <p>{meta.label}</p>
                    <p className="text-[10px] text-slate-400">{timeAgo(r.changedAt)}{r.changedBy ? ` · ${r.changedBy.username}` : ''}</p>
                  </TableCell>
                  <TableCell className={cn('font-bold', r.quantityChange < 0 ? 'text-slate-900' : 'text-emerald-700')}>
                    {r.quantityChange > 0 ? '+' : ''}{formatNumber(r.quantityChange)} {r.medicine?.unit}
                  </TableCell>
                  <TableCell><StatusDot tone={st.tone}>{st.label}</StatusDot></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="Row actions" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><DotsHorizontal className="size-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{formatNumber(r.quantityBefore)} → {formatNumber(r.quantityAfter)} {r.medicine?.unit}</DropdownMenuLabel>
                        {r.reason && <p className="max-w-56 px-2.5 pb-2 text-[11px] text-slate-500">{r.reason}</p>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href={`/dashboard/medicines?q=${encodeURIComponent(r.medicine?.sku ?? '')}`}>Open in inventory</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
