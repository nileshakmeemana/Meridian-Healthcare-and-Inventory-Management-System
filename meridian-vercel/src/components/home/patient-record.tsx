'use client';
import Link from 'next/link';
import { ArrowLeft, Phone, MarkerPin01, AlertTriangle, HeartRounded, Calendar, File06 } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { formatDate, personName, initials } from '@/lib/utils';
import type { Patient, Prescription } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoryRow {
  _id: string; appointmentId: string; appointmentDate: string; appointmentTime: string; appointmentStatus: string; reason?: string; notes?: string;
  doctorName: string; specialization: string; diagnosis?: string; prescriptionStatus?: string; medicinesPrescribed: number;
}
interface Record { patient: Patient & { user?: { email?: string; username?: string; isActive?: boolean } }; history: HistoryRow[]; prescriptions: Prescription[] }

/** Patient profile + full history from the vw_patient_medical_history view */
export function PatientRecord({ id, self = false }: { id: string; self?: boolean }) {
  const role = useAuth((s) => s.user!.role);
  const { data, loading, error, reload } = useApi(() => get<Record>(`/patients/${id}`), [id]);
  const p = data?.patient;

  return (
    <>
      <PageHeader title={self ? 'Medical History' : p ? personName(p) : 'Patient record'}
        description={self ? 'Every visit, diagnosis and prescription on your record' : <>Read from the <span className="font-mono">vw_patient_medical_history</span> view</>}
        actions={self ? <Button asChild><Link href="/dashboard/appointments?new=1">Book a visit</Link></Button> : <Button variant="outline" asChild><Link href="/dashboard/patients"><ArrowLeft /> All patients</Link></Button>} />

      {error ? <div className="rounded-2xl border border-slate-200/80 bg-white"><ErrorState message={error} onRetry={reload} /></div> : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card lg:col-span-4">
            {loading || !p ? <Skeleton className="h-64 w-full" /> : (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14"><AvatarFallback className="text-base">{initials(personName(p))}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-900">{personName(p)}</h2>
                    <p className="text-xs text-slate-500">{p.age ?? '—'} yrs · {p.gender}{p.user?.email ? ` · ${p.user.email}` : ''}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-200/70 bg-[#fafbfc] p-3 text-center">
                  <div><p className="text-base font-extrabold text-rose-600">{p.bloodGroup ?? '—'}</p><p className="text-[10px] text-slate-400">Blood</p></div>
                  <div><p className="text-base font-extrabold text-slate-900">{data!.history.length}</p><p className="text-[10px] text-slate-400">Visits</p></div>
                  <div><p className="text-base font-extrabold text-slate-900">{data!.prescriptions.length}</p><p className="text-[10px] text-slate-400">Rx</p></div>
                </div>
                <dl className="mt-5 space-y-3 text-xs">
                  <div className="flex gap-2"><Calendar className="size-4 shrink-0 text-slate-400" /><span className="text-slate-600">Born {formatDate(p.dateOfBirth)}</span></div>
                  {p.phone && <div className="flex gap-2"><Phone className="size-4 shrink-0 text-slate-400" /><span className="text-slate-600">{p.phone}</span></div>}
                  {p.address && <div className="flex gap-2"><MarkerPin01 className="size-4 shrink-0 text-slate-400" /><span className="text-slate-600">{p.address}</span></div>}
                  {p.emergencyContact && <div className="flex gap-2"><HeartRounded className="size-4 shrink-0 text-slate-400" /><span className="text-slate-600">Emergency: {p.emergencyContact}{p.emergencyPhone ? ` · ${p.emergencyPhone}` : ''}</span></div>}
                </dl>
                <div className={`mt-5 rounded-xl border px-3 py-2.5 text-xs ${p.allergies ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="size-3.5" /> Allergies</p>
                  <p className="mt-0.5">{p.allergies || 'None recorded'}</p>
                </div>
                {role === 'doctor' && <Button className="mt-5 w-full" asChild><Link href="/dashboard/appointments">Open my schedule</Link></Button>}
              </>
            )}
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
              <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold tracking-tight text-slate-900">Visit history</h2></div>
              {loading ? <TableSkeleton rows={4} /> : !data?.history.length ? <EmptyState icon={Calendar} title="No visits yet" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead>Reason / diagnosis</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.history.map((h) => (
                      <TableRow key={h._id ?? h.appointmentId}>
                        <TableCell className="whitespace-nowrap"><p className="font-bold text-slate-900">{formatDate(h.appointmentDate)}</p><p className="text-[10px] text-slate-400">{h.appointmentTime}</p></TableCell>
                        <TableCell><p className="font-semibold text-slate-900">{h.doctorName}</p><p className="text-[10px] text-slate-400">{h.specialization}</p></TableCell>
                        <TableCell className="max-w-72">
                          <p className="truncate text-slate-700">{h.diagnosis ?? h.reason ?? '—'}</p>
                          {h.medicinesPrescribed > 0 && <p className="text-[10px] text-slate-400">{h.medicinesPrescribed} medicine(s) · Rx {h.prescriptionStatus?.toLowerCase()}</p>}
                          {h.notes && <p className="truncate text-[10px] text-slate-400" title={h.notes}>{h.notes}</p>}
                        </TableCell>
                        <TableCell><StatusDot tone={STATUS_TONE[h.appointmentStatus] ?? 'slate'}>{h.appointmentStatus}</StatusDot></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
              <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold tracking-tight text-slate-900">Prescriptions</h2></div>
              {loading ? <TableSkeleton rows={3} /> : !data?.prescriptions.length ? <EmptyState icon={File06} title="No prescriptions yet" /> : (
                <ul className="divide-y divide-slate-100">
                  {data.prescriptions.map((rx) => (
                    <li key={rx._id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{rx.diagnosis}</p>
                        <p className="text-[11px] text-slate-500">{personName(rx.doctor, 'Dr. ')} · {formatDate(rx.issuedDate)}</p>
                        <p className="mt-1 text-[11px] text-slate-600">{rx.items.map((i) => `${i.medicine?.name} × ${i.quantity}`).join(', ')}</p>
                      </div>
                      <Badge variant={rx.status === 'Active' ? 'success' : 'gray'}>{rx.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
