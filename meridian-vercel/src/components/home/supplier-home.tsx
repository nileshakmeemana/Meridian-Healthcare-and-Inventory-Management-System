'use client';
import Link from 'next/link';
import { BankNote02, Inbox01, Truck01, ArrowRight } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatDate, formatLKR, formatNumber } from '@/lib/utils';
import type { MedicineRequest, SupplyOrder } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, TableSkeleton } from '@/components/dashboard/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const PRIORITY_VARIANT = { Low: 'gray', Normal: 'blue', High: 'warning', Urgent: 'error' } as const;

export function SupplierHome() {
  const user = useAuth((s) => s.user)!;
  const home = useApi(() => get<{ openRequests: number; inTransit: number; deliveredMonth: number; deliveredValue: number; deliveredUnits: number }>('/reports/home'), []);
  const requests = useApi(() => get<MedicineRequest[]>('/requests', { status: 'Pending' }), []);
  const orders = useApi(() => get<SupplyOrder[]>('/supply-orders'), []);
  const h = home.data;

  return (
    <>
      <PageHeader title={user.profile?.companyName ?? user.displayName} description="Restock requests from Meridian Central Hospital and your deliveries"
        actions={<Button asChild><Link href="/dashboard/supply-orders?new=1">Dispatch supply</Link></Button>} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard index={0} tone="brand" icon={BankNote02} title="Value Delivered" subtitle={`${formatNumber(h?.deliveredUnits)} units received by the hospital`} loading={home.loading}
          value={formatLKR(h?.deliveredValue, { compact: (h?.deliveredValue ?? 0) > 9_999_999 })} badge={{ label: `${h?.deliveredMonth ?? 0} this month` }}
          footer={{ label: 'Supply history', href: '/dashboard/supply-orders' }} />
        <MetricCard index={1} tone="amber" icon={Inbox01} title="Open Requests" subtitle="Waiting for a supplier" loading={home.loading}
          value={`${h?.openRequests ?? 0} Requests`} badge={{ label: 'Respond to win the order', tone: 'amber' }} footer={{ label: 'Review requests', href: '/dashboard/requests' }} />
        <MetricCard index={2} icon={Truck01} title="In Transit" subtitle="Dispatched, awaiting hospital receipt" loading={home.loading}
          value={`${h?.inTransit ?? 0} Orders`} badge={{ label: 'Stock updates on delivery', tone: 'emerald' }} footer={{ label: 'Track orders', href: '/dashboard/supply-orders?status=Shipped' }} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Open restock requests</h2>
            <Link href="/dashboard/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">All <ArrowRight className="size-3.5" /></Link>
          </div>
          {requests.loading ? <TableSkeleton rows={4} /> : !requests.data?.length ? <EmptyState icon={Inbox01} title="No open requests" description="New restock requests from the pharmacy appear here." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Priority</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {requests.data.slice(0, 6).map((r) => (
                  <TableRow key={r._id}>
                    <TableCell><p className="font-bold text-slate-900">{r.medicine?.name ?? r.medicineName}</p><p className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</p></TableCell>
                    <TableCell className="font-bold">{formatNumber(r.quantityRequested)}</TableCell>
                    <TableCell><Badge variant={PRIORITY_VARIANT[r.priority]}>{r.priority}</Badge></TableCell>
                    <TableCell className="text-right"><Button size="sm" asChild><Link href={`/dashboard/supply-orders?new=1&request=${r._id}`}>Dispatch</Link></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent deliveries</h2>
            <Link href="/dashboard/supply-orders" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">All <ArrowRight className="size-3.5" /></Link>
          </div>
          {orders.loading ? <TableSkeleton rows={4} /> : !orders.data?.length ? <EmptyState icon={Truck01} title="No deliveries yet" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.data.slice(0, 6).map((o) => (
                  <TableRow key={o._id}>
                    <TableCell><p className="font-bold text-slate-900">{o.medicine?.name}</p><p className="font-mono text-[10px] text-slate-400">{o.batchNumber ?? '—'}</p></TableCell>
                    <TableCell className="font-bold">{formatNumber(o.quantity)}</TableCell>
                    <TableCell>{formatLKR(o.totalCost)}</TableCell>
                    <TableCell><StatusDot tone={STATUS_TONE[o.status]}>{o.status}</StatusDot></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
