'use client';
import { useEffect, useState } from 'react';
import { Plus, Receipt, BankNote02, SwitchHorizontal01, ChevronDown, ChevronUp } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { useApi, useUrlFlag } from '@/lib/hooks';
import { formatDate, formatLKR, formatNumber, personName, shortId, toISODate } from '@/lib/utils';
import type { Sale } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatTile } from '@/components/dashboard/metric-card';
import { Pagination } from '@/components/dashboard/pagination';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { SaleDialog } from '@/components/forms/sale-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Fragment } from 'react';

export default function SalesPage() {
  return <RoleGate roles={['admin', 'pharmacist']}><Sales /></RoleGate>;
}

function Sales() {
  const role = useAuth((s) => s.user!.role);
  const refreshCounts = useCounts((s) => s.refresh);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useUrlFlag('new');
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setPage(1), [from, to]);

  const { data, loading, error, reload } = useApi(async () => {
    const res = await api.get('/sales', { params: { from: from || undefined, to: to || undefined, page, limit: 15 } });
    return { rows: res.data.data as Sale[], pagination: res.data.pagination };
  }, [from, to, page]);
  const revenue = useApi(() => get<{ total: number; series: { day: string; revenue: number }[] }>('/reports/revenue', { days: 30 }), []);

  return (
    <>
      <PageHeader title="Dispensation" description="Every sale and ward issue recorded through sp_issue_medicine"
        actions={role === 'pharmacist' ? <Button onClick={() => setOpen(true)}><Plus /> New sale</Button> : undefined} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={BankNote02} tone="amber" label="Revenue · last 30 days" value={formatLKR(revenue.data?.total, { compact: true })} hint="fn_get_total_revenue" />
        <StatTile icon={Receipt} tone="blue" label="Transactions" value={formatNumber(data?.pagination?.total)} hint={from || to ? 'In the selected range' : 'All time'} />
        <StatTile icon={SwitchHorizontal01} tone="slate" label="Units on this page" value={formatNumber(data?.rows.reduce((s, r) => s + r.items.reduce((t, i) => t + i.quantity, 0), 0))} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Sales log</h2>
            <p className="mt-0.5 text-xs text-slate-500">Click a row to see its line items</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} max={to || toISODate()} onChange={(e) => setFrom(e.target.value)} className="w-40 text-xs" aria-label="From" />
            <span className="text-xs text-slate-400">to</span>
            <Input type="date" value={to} min={from} max={toISODate()} onChange={(e) => setTo(e.target.value)} className="w-40 text-xs" aria-label="To" />
            {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}
          </div>
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <TableSkeleton rows={8} /> : data.rows.length === 0 ? <EmptyState icon={Receipt} title="No sales in this range" /> : (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Sale</TableHead><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Department</TableHead><TableHead>Items</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {data.rows.map((s) => (
                  <Fragment key={s._id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                      <TableCell className="font-mono text-[11px] text-slate-600">#{shortId(s._id)}</TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">{formatDate(s.saleDate, 'dd MMM yyyy, HH:mm')}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{s.patient ? personName(s.patient) : <span className="text-slate-400">Walk-in</span>}</TableCell>
                      <TableCell className="text-slate-600">{s.department}</TableCell>
                      <TableCell className="text-slate-600">{s.items.length} · {s.items.reduce((t, i) => t + i.quantity, 0)} units</TableCell>
                      <TableCell><Badge variant={s.paymentMethod === 'Insurance' ? 'purple' : 'gray'}>{s.paymentMethod}</Badge>{s.prescription && <Badge variant="brand" className="ml-1">Rx</Badge>}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatLKR(s.totalAmount)}</TableCell>
                      <TableCell className="w-8 text-slate-400">{expanded === s._id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</TableCell>
                    </TableRow>
                    {expanded === s._id && (
                      <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                        <TableCell colSpan={8}>
                          <div className="grid gap-1.5 rounded-xl border border-slate-200/70 bg-white p-3">
                            {s.items.map((i, idx) => (
                              <div key={idx} className="flex justify-between text-xs"><span className="font-semibold text-slate-800">{i.medicine?.name} <span className="font-normal text-slate-400">× {i.quantity} @ {formatLKR(i.unitPrice)}</span></span><span className="font-bold">{formatLKR(i.subtotal)}</span></div>
                            ))}
                            <p className="mt-1 text-[11px] text-slate-400">Pharmacist: {personName(s.pharmacist)}{s.notes ? ` · ${s.notes}` : ''}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            {data.pagination && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPage={setPage} />}
          </>
        )}
      </div>
      {role === 'pharmacist' && <SaleDialog open={open} onOpenChange={setOpen} onSaved={() => { reload(); revenue.reload(); refreshCounts(role); }} />}
    </>
  );
}
