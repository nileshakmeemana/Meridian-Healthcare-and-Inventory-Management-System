'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, ChevronDown, RefreshCcw01, Users01, Calendar, BankNote02 } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatLKR, formatNumber } from '@/lib/utils';
import type { DashboardStats } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { MetricCard, StatTile } from '@/components/dashboard/metric-card';
import { DepartmentStock } from '@/components/dashboard/department-stock';
import { ConsumptionCard } from '@/components/dashboard/consumption-card';
import { MovementsTable } from '@/components/dashboard/movements-table';
import { ErrorState } from '@/components/dashboard/states';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Stethoscope } from '@/components/icons/pill';
import { CATEGORIES } from '@/lib/constants';

const outlineBtn = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50';

/** Admin & pharmacist overview — a faithful port of the supplied dashboard HTML, on live data */
export function InventoryHome() {
  const user = useAuth((s) => s.user)!;
  const [syncKey, setSyncKey] = useState(0);
  const { data: s, loading, error, reload } = useApi(() => get<DashboardStats>('/reports/dashboard'), [syncKey]);
  const isAdmin = user.role === 'admin';

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Hospital Overview' : 'Inventory Overview'}
        description="Live operational status of clinical supplies, drugs, and ward reserves"
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger className={outlineBtn}>All Departments <ChevronDown className="size-3.5 text-slate-400" /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                <DropdownMenuItem asChild><Link href="/dashboard/medicines">All categories</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                {CATEGORIES.map((c) => <DropdownMenuItem key={c} asChild><Link href={`/dashboard/medicines?category=${encodeURIComponent(c)}`}>{c}</Link></DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <button className={outlineBtn} onClick={() => setSyncKey((k) => k + 1)}>
              <RefreshCcw01 className="size-3.5 text-slate-500" /> Sync Stock
            </button>
          </>
        }
      />

      {error ? <div className="rounded-2xl border border-slate-200/80 bg-white"><ErrorState message={error} onRetry={reload} /></div> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard index={0} tone="brand" icon={Package} title="Active Stock Value" loading={loading}
            subtitle={s ? `${formatNumber(s.stockUnits)} units across ${s.totalMedicines} SKUs` : 'Loading…'}
            value={formatLKR(s?.stockValue, { compact: (s?.stockValue ?? 0) > 9_999_999 })}
            badge={{ label: `${formatNumber(s?.monthUnitsDispensed)} out this month` }}
            footer={{ label: 'Review full stock audit', href: '/dashboard/medicines' }} />
          <MetricCard index={1} tone="amber" icon={AlertTriangle} title="Low Stock Reorder" subtitle="Urgent replenishment required" loading={loading}
            value={`${s?.lowStockCount ?? 0} SKUs`}
            badge={{ label: `${s?.expiredCount ?? 0} Expired · ${s?.pendingRequests ?? 0} Open POs`, tone: 'amber' }}
            footer={{ label: 'Generate purchase order', href: '/dashboard/requests?new=1' }} />
          <MetricCard index={2} icon={CheckCircle} title="Prescriptions Fulfilled" subtitle="Monthly inpatient & outpatient outflow" loading={loading}
            value={`${formatNumber(s?.monthUnitsDispensed)} Units`}
            badge={{ label: `${formatLKR(s?.monthRevenue, { compact: true })} this month`, tone: 'emerald' }}
            footer={{ label: 'View dispensation logs', href: '/dashboard/sales' }} />
        </div>
      )}

      {isAdmin && s && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={Users01} tone="blue" label="Active patients" value={formatNumber(s.totalActivePatients)} hint="Registered & active" />
          <StatTile icon={Stethoscope} tone="purple" label="Doctors on staff" value={s.totalActiveDoctors} hint={`${s.totalPharmacists} pharmacists · ${s.totalSuppliers} suppliers`} />
          <StatTile icon={Calendar} tone="slate" label="Appointments today" value={s.todayAppointments} hint={`${s.completedToday} completed`} />
          <StatTile icon={BankNote02} tone="amber" label="Revenue today" value={formatLKR(s.todayRevenue, { compact: true })} hint={`${formatLKR(s.monthRevenue, { compact: true })} month to date`} />
        </div>
      )}

      <div key={`mid-${syncKey}`} className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <DepartmentStock className="lg:col-span-5" />
        <ConsumptionCard className="lg:col-span-7" />
      </div>

      <MovementsTable key={`mv-${syncKey}`} />
    </>
  );
}
