'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Calendar, Clock, MarkerPin01, Award01 } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatLKR, personName, initials, cn } from '@/lib/utils';
import { WEEKDAYS } from '@/lib/constants';
import type { Doctor } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { EmptyState, ErrorState } from '@/components/dashboard/states';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope } from '@/components/icons/pill';

export default function DoctorsPage() {
  const role = useAuth((s) => s.user!.role);
  const { data, loading, error, reload } = useApi(() => get<Doctor[]>('/doctors'), []);
  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('all');
  const specs = useMemo(() => [...new Set((data ?? []).map((d) => d.specialization))].sort(), [data]);
  const rows = (data ?? []).filter((d) => (spec === 'all' || d.specialization === spec) && `${personName(d)} ${d.specialization}`.toLowerCase().includes(q.toLowerCase()));
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <>
      <PageHeader title={role === 'patient' ? 'Find a Doctor' : 'Doctors'} description="Consultants, their specialities and consulting days"
        actions={<><SearchInput value={q} onChange={setQ} placeholder="Name or speciality…" />
          <Select value={spec} onValueChange={setSpec}><SelectTrigger className="w-48 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All specialities</SelectItem>{specs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? <EmptyState icon={Stethoscope} title="No doctors match" /> : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => (
            <div key={d._id} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Avatar className="size-12"><AvatarFallback className="text-sm">{initials(personName(d))}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-slate-900">{personName(d, 'Dr. ')}</h3>
                  <p className="truncate text-xs text-brand-700">{d.specialization}</p>
                </div>
                {d.availableDays.includes(today) ? <Badge variant="success">In today</Badge> : <Badge>Off today</Badge>}
              </div>
              {d.bio && <p className="mt-3 line-clamp-2 text-xs text-slate-500">{d.bio}</p>}
              <div className="mt-4 flex gap-1">
                {WEEKDAYS.map((w) => (
                  <span key={w} className={cn('flex-1 rounded-md py-1 text-center text-[10px] font-bold', d.availableDays.includes(w) ? 'bg-brand-50 text-brand-800' : 'bg-slate-50 text-slate-300')}>{w[0]}</span>
                ))}
              </div>
              <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2"><Award01 className="size-3.5 text-slate-400" />{d.experienceYears ?? 0} years experience · {d.licenseNumber}</div>
                {d.room && <div className="flex items-center gap-2"><MarkerPin01 className="size-3.5 text-slate-400" />{d.room}</div>}
                {role !== 'patient' && <div className="flex items-center gap-2"><Clock className="size-3.5 text-slate-400" />{d.appointmentsToday ?? 0} appointments today</div>}
              </dl>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-extrabold text-slate-900">{formatLKR(d.consultationFee)}<span className="text-[10px] font-medium text-slate-400"> / visit</span></span>
                {(role === 'patient' || role === 'admin') && <Button size="sm" asChild><Link href={`/dashboard/appointments?new=1&doctor=${d._id}`}><Calendar /> Book</Link></Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
