'use client';
import Link from 'next/link';
import { CalendarCheck01, File06, HeartRounded, ArrowRight, Clock } from '@untitledui/icons';
import { get, api } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatDate, personName } from '@/lib/utils';
import type { Appointment, Prescription } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, TableSkeleton } from '@/components/dashboard/states';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { greeting } from './doctor-home';

export function PatientHome() {
  const user = useAuth((s) => s.user)!;
  const home = useApi(() => get<{ upcoming: number; past: number; activeRx: number; totalRx: number }>('/reports/home'), []);
  const upcoming = useApi(async () => (await api.get('/appointments', { params: { upcoming: 1, status: 'Scheduled', limit: 5 } })).data.data as Appointment[], []);
  const rx = useApi(() => get<Prescription[]>('/prescriptions'), []);
  const next = upcoming.data?.[0];
  const h = home.data;

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.profile?.firstName ?? user.displayName}`} description="Your visits, prescriptions and care team in one place"
        actions={<Button asChild><Link href="/dashboard/appointments?new=1">Book a visit</Link></Button>} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard index={0} tone="brand" icon={CalendarCheck01} title="Next Appointment" loading={upcoming.loading}
          subtitle={next ? `${personName(next.doctor, 'Dr. ')} · ${next.doctor?.specialization}` : 'Nothing booked yet'}
          value={next ? formatDate(next.appointmentDate, 'dd MMM') : 'None'}
          badge={next ? { label: next.appointmentTime } : undefined}
          footer={{ label: next ? 'Manage appointments' : 'Book your first visit', href: next ? '/dashboard/appointments' : '/dashboard/appointments?new=1' }} />
        <MetricCard index={1} tone="blue" icon={File06} title="Active Prescriptions" subtitle="Ready to collect at the pharmacy" loading={home.loading}
          value={`${h?.activeRx ?? 0} Active`} badge={{ label: `${h?.totalRx ?? 0} total`, tone: 'blue' }} footer={{ label: 'View prescriptions', href: '/dashboard/prescriptions' }} />
        <MetricCard index={2} icon={HeartRounded} title="Completed Visits" subtitle="Your consultation history" loading={home.loading}
          value={`${h?.past ?? 0} Visits`} badge={{ label: `${h?.upcoming ?? 0} upcoming`, tone: 'emerald' }} footer={{ label: 'Open medical history', href: '/dashboard/history' }} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Upcoming visits</h2>
            <Link href="/dashboard/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">All <ArrowRight className="size-3.5" /></Link>
          </div>
          {upcoming.loading ? <TableSkeleton rows={3} /> : !upcoming.data?.length ? (
            <EmptyState icon={CalendarCheck01} title="No upcoming visits" action={<Button size="sm" asChild><Link href="/dashboard/doctors">Find a doctor</Link></Button>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.data.map((a) => (
                <li key={a._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-slate-200/70 bg-[#fafbfc] py-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{formatDate(a.appointmentDate, 'MMM')}</span>
                    <span className="text-base leading-none font-extrabold text-slate-900">{formatDate(a.appointmentDate, 'dd')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{personName(a.doctor, 'Dr. ')}</p>
                    <p className="flex items-center gap-1 truncate text-[11px] text-slate-500"><Clock className="size-3" /> {a.appointmentTime} · {a.doctor?.specialization}</p>
                  </div>
                  <StatusDot tone={STATUS_TONE[a.status]}>{a.status}</StatusDot>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent prescriptions</h2>
            <Link href="/dashboard/prescriptions" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">All <ArrowRight className="size-3.5" /></Link>
          </div>
          {rx.loading ? <TableSkeleton rows={3} /> : !rx.data?.length ? <EmptyState icon={File06} title="No prescriptions yet" /> : (
            <ul className="divide-y divide-slate-100">
              {rx.data.slice(0, 5).map((p) => (
                <li key={p._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{p.diagnosis}</p>
                    <p className="truncate text-[11px] text-slate-500">{personName(p.doctor, 'Dr. ')} · {formatDate(p.issuedDate)} · {p.items.length} item{p.items.length === 1 ? '' : 's'}</p>
                  </div>
                  <Badge variant={p.status === 'Active' ? 'success' : 'gray'}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
