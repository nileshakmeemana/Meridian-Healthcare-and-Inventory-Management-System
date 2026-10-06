'use client';
import Link from 'next/link';
import { Calendar, CalendarCheck01, File06, Users01, Inbox01, ArrowRight } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatDate, initials } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { MetricCard, StatTile } from '@/components/dashboard/metric-card';
import { BarChart } from '@/components/dashboard/bar-chart';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface TodayRow { _id: string; appointmentTime: string; status: string; reason?: string; patientId: string; patientName: string; patientAge: number; bloodGroup?: string; hasPrescription: boolean; doctorId: string; doctorName: string; specialization: string }

export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export function DoctorHome() {
  const user = useAuth((s) => s.user)!;
  const home = useApi(() => get<{ todayCount: number; completedToday: number; upcoming: number; patients: number; openRequests: number; prescriptionsMonth: number }>('/reports/home'), []);
  const today = useApi(() => get<TodayRow[]>('/appointments/today'), []);
  const daily = useApi(() => get<{ day: string; patients: number; visits: number }[]>('/reports/daily-patients', { days: 10 }), []);
  const h = home.data;
  const mine = (today.data ?? []).filter((r) => String(r.doctorId) === user.profileId);

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.displayName}`}
        description={`${formatDate(new Date(), 'EEEE, dd MMMM yyyy')} · ${user.profile?.specialization ?? 'Consultant'}${user.profile?.room ? ` · ${user.profile.room}` : ''}`}
        actions={<><Button variant="outline" asChild><Link href="/dashboard/requests?new=1">Request medicine</Link></Button><Button asChild><Link href="/dashboard/appointments">Open schedule</Link></Button></>} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard index={0} tone="brand" icon={Calendar} title="Today's Clinic" subtitle="Booked consultations" loading={home.loading}
          value={`${h?.todayCount ?? 0} Patients`} badge={{ label: `${h?.completedToday ?? 0} completed` }} footer={{ label: "Go to today's appointments", href: '/dashboard/appointments' }} />
        <MetricCard index={1} tone="blue" icon={CalendarCheck01} title="Upcoming" subtitle="Scheduled after today" loading={home.loading}
          value={`${h?.upcoming ?? 0} Visits`} badge={{ label: `${h?.patients ?? 0} patients in care`, tone: 'blue' }} footer={{ label: 'View my patients', href: '/dashboard/patients' }} />
        <MetricCard index={2} icon={File06} title="Prescriptions" subtitle="Issued this month" loading={home.loading}
          value={`${h?.prescriptionsMonth ?? 0} Issued`} badge={{ label: `${h?.openRequests ?? 0} open requisitions`, tone: h?.openRequests ? 'amber' : 'emerald' }} footer={{ label: 'Prescription history', href: '/dashboard/prescriptions' }} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Today&apos;s Schedule</h2>
              <p className="mt-0.5 text-xs text-slate-500">Read from the <span className="font-mono">vw_doctor_schedule_today</span> view</p>
            </div>
            <Link href="/dashboard/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">All appointments <ArrowRight className="size-3.5" /></Link>
          </div>
          {today.error ? <ErrorState message={today.error} onRetry={today.reload} /> : today.loading ? <TableSkeleton rows={4} /> : mine.length === 0 ? (
            <EmptyState icon={Calendar} title="No patients today" description="New bookings will show up here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {mine.map((a) => (
                <li key={a._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-16 shrink-0 text-xs font-bold text-slate-900">{a.appointmentTime}</div>
                  <Avatar><AvatarFallback>{initials(a.patientName)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/patients/${a.patientId}`} className="block truncate text-sm font-bold text-slate-900 hover:underline">{a.patientName}</Link>
                    <p className="truncate text-[11px] text-slate-500">{a.patientAge} yrs{a.bloodGroup ? ` · ${a.bloodGroup}` : ''}{a.reason ? ` · ${a.reason}` : ''}</p>
                  </div>
                  {a.hasPrescription && <Badge variant="brand">Rx issued</Badge>}
                  <StatusDot tone={STATUS_TONE[a.status] ?? 'slate'}>{a.status}</StatusDot>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <p className="text-xs font-medium text-slate-500">Hospital patient flow · last 10 days</p>
            {daily.loading ? <Skeleton className="mt-1 h-8 w-28" /> : (
              <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{(daily.data ?? []).reduce((t, d) => t + d.visits, 0)} Visits</h2>
            )}
            {daily.data && (
              <BarChart unit="patients" height={150} data={daily.data.map((d) => ({
                label: formatDate(d.day, 'dd'), value: d.patients, caption: formatDate(d.day, 'EEE, dd MMM'),
                rows: [{ label: 'Appointments', value: String(d.visits), accent: true }],
              }))} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatTile icon={Users01} tone="blue" label="Patients in care" value={h?.patients ?? '—'} />
            <StatTile icon={Inbox01} tone="amber" label="Open requests" value={h?.openRequests ?? '—'} />
          </div>
        </div>
      </div>
    </>
  );
}
