'use client';
import { Building07, Mail01, Phone, Star01 } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatDate, formatLKR, formatNumber, cn } from '@/lib/utils';
import type { Supplier } from '@/lib/types';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState, ErrorState } from '@/components/dashboard/states';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function SuppliersPage() {
  return <RoleGate roles={['admin', 'pharmacist']}><Suppliers /></RoleGate>;
}

function Suppliers() {
  const { data, loading, error, reload } = useApi(() => get<Supplier[]>('/suppliers'), []);
  return (
    <>
      <PageHeader title="Suppliers" description={<>Partners and their delivery record from the <span className="font-mono">vw_supplier_performance</span> view</>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : !data?.length ? <EmptyState icon={Building07} title="No suppliers yet" /> : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => {
            const p = s.performance;
            const rate = p?.deliveryRatePct ?? null;
            return (
              <div key={s._id} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-sky-200/60 bg-sky-50 text-sky-700"><Building07 className="size-5" /></div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900">{s.companyName}</h3>
                      <p className="truncate text-xs text-slate-500">{s.contactPerson ?? '—'}{s.licenseNumber ? ` · ${s.licenseNumber}` : ''}</p>
                    </div>
                  </div>
                  {s.user && !s.user.isActive ? <Badge variant="error">Inactive</Badge> : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Star01 className="size-3.5 fill-amber-400 text-amber-400" />{s.rating?.toFixed(1)}</span>}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-200/70 bg-[#fafbfc] p-3 text-center">
                  <div><p className="text-base font-extrabold text-slate-900">{p?.totalOrders ?? 0}</p><p className="text-[10px] text-slate-400">Orders</p></div>
                  <div><p className="text-base font-extrabold text-slate-900">{formatNumber(p?.totalUnitsSupplied, true)}</p><p className="text-[10px] text-slate-400">Units</p></div>
                  <div><p className="text-base font-extrabold text-slate-900">{formatLKR(p?.totalValueSupplied, { compact: true }).replace('Rs. ', '')}</p><p className="text-[10px] text-slate-400">Value (Rs.)</p></div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[11px]"><span className="font-semibold text-slate-600">Delivery rate</span><span className="font-bold text-slate-900">{rate == null ? '—' : `${rate}%`}</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', (rate ?? 0) >= 90 ? 'bg-emerald-500' : (rate ?? 0) >= 70 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${rate ?? 0}%` }} />
                  </div>
                </div>
                <div className="mt-auto space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  {s.email && <p className="flex items-center gap-2"><Mail01 className="size-3.5" />{s.email}</p>}
                  {s.phone && <p className="flex items-center gap-2"><Phone className="size-3.5" />{s.phone}</p>}
                  <p className="text-[11px] text-slate-400">Last supply: {formatDate(p?.lastSupplyDate)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
