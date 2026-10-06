'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Calendar, DotsHorizontal, File06, CheckCircle, XCircle, Edit05, UserX01 } from '@untitledui/icons';
import { api } from '@/lib/api';
import { useApi, useUrlFlag } from '@/lib/hooks';
import { apiError, formatDate, personName, toISODate } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { PageHeader } from '@/components/dashboard/page-header';
import { Pagination } from '@/components/dashboard/pagination';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { BookingDialog } from '@/components/forms/booking-dialog';
import { PrescriptionDialog } from '@/components/forms/prescription-dialog';
import { Field } from '@/components/forms/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { initials } from '@/lib/utils';

const VIEWS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function AppointmentsPage() {
  const user = useAuth((s) => s.user!);
  const role = user.role;
  const refreshCounts = useCounts((s) => s.refresh);
  const [view, setView] = useState(role === 'doctor' ? 'today' : 'upcoming');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [view]);

  const params = (() => {
    const today = toISODate();
    if (view === 'today') return { from: today, to: today };
    if (view === 'upcoming') return { upcoming: 1, status: 'Scheduled' };
    if (view === 'all') return {};
    return { status: view };
  })();
  const { data, loading, error, reload } = useApi(async () => {
    const res = await api.get('/appointments', { params: { ...params, page, limit: 15 } });
    return { rows: res.data.data as Appointment[], pagination: res.data.pagination };
  }, [view, page]);

  const [booking, setBooking] = useUrlFlag('new');
  const [prescribing, setPrescribing] = useState<Appointment | null>(null);
  const [noting, setNoting] = useState<Appointment | null>(null);
  const [changing, setChanging] = useState<{ appt: Appointment; status: AppointmentStatus } | null>(null);
  const done = () => { reload(); refreshCounts(role); };

  const setStatus = async () => {
    try { const r = await api.patch(`/appointments/${changing!.appt._id}/status`, { status: changing!.status }); toast.success(r.data.message); done(); }
    catch (e) { toast.error(apiError(e)); throw e; }
  };

  const canBook = role === 'patient' || role === 'admin' || role === 'doctor';
  const showPatient = role !== 'patient';
  const showDoctor = role !== 'doctor';

  return (
    <>
      <PageHeader title={role === 'patient' ? 'My Appointments' : 'Appointments'}
        description={role === 'doctor' ? 'Your clinic schedule — complete visits by issuing a prescription' : role === 'patient' ? 'Book, review and cancel your visits' : 'Every consultation across the hospital'}
        actions={canBook ? <Button onClick={() => setBooking(true)}><Plus /> {role === 'patient' ? 'Book visit' : 'New appointment'}</Button> : undefined} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={view} onValueChange={setView}><TabsList>{VIEWS.map((v) => <TabsTrigger key={v.value} value={v.value}>{v.label}</TabsTrigger>)}</TabsList></Tabs>
          {data?.pagination && <p className="text-xs text-slate-500">{data.pagination.total} appointment{data.pagination.total === 1 ? '' : 's'}</p>}
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <TableSkeleton rows={8} /> : data.rows.length === 0 ? (
          <EmptyState icon={Calendar} title="No appointments in this view" action={canBook ? <Button size="sm" onClick={() => setBooking(true)}>Book one</Button> : undefined} />
        ) : (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Date & time</TableHead>{showPatient && <TableHead>Patient</TableHead>}{showDoctor && <TableHead>Doctor</TableHead>}<TableHead>Reason / notes</TableHead><TableHead>Status</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {data.rows.map((a) => {
                  const scheduled = a.status === 'Scheduled';
                  return (
                    <TableRow key={a._id}>
                      <TableCell className="whitespace-nowrap"><p className="font-bold text-slate-900">{formatDate(a.appointmentDate, 'EEE, dd MMM yyyy')}</p><p className="text-[11px] text-slate-500">{a.appointmentTime}</p></TableCell>
                      {showPatient && (
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7"><AvatarFallback>{initials(personName(a.patient))}</AvatarFallback></Avatar>
                            <div><Link href={`/dashboard/patients/${a.patient?._id}`} className="font-semibold text-slate-900 hover:underline">{personName(a.patient)}</Link>
                              <p className="text-[10px] text-slate-400">{a.patient?.phone ?? ''}</p></div>
                          </div>
                        </TableCell>
                      )}
                      {showDoctor && <TableCell><p className="font-semibold text-slate-900">{personName(a.doctor, 'Dr. ')}</p><p className="text-[10px] text-slate-400">{a.doctor?.specialization}{a.doctor?.room ? ` · ${a.doctor.room}` : ''}</p></TableCell>}
                      <TableCell className="max-w-64"><p className="truncate text-slate-700">{a.reason || '—'}</p>{a.notes && <p className="truncate text-[10px] text-slate-400" title={a.notes}>{a.notes}</p>}</TableCell>
                      <TableCell><StatusDot tone={STATUS_TONE[a.status]}>{a.status}</StatusDot></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {role === 'doctor' && scheduled && <Button size="sm" onClick={() => setPrescribing(a)}><File06 /> Prescribe</Button>}
                          {role === 'patient' && scheduled && <Button size="sm" variant="outline" onClick={() => setChanging({ appt: a, status: 'Cancelled' })}>Cancel</Button>}
                          {(role === 'doctor' || role === 'admin') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger aria-label="More actions" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><DotsHorizontal className="size-4" /></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {role === 'doctor' && <DropdownMenuItem onSelect={() => setNoting(a)}><Edit05 /> Diagnosis notes</DropdownMenuItem>}
                                <DropdownMenuItem asChild><Link href={`/dashboard/patients/${a.patient?._id}`}><File06 /> Patient record</Link></DropdownMenuItem>
                                {scheduled && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setChanging({ appt: a, status: 'Completed' })}><CheckCircle /> Mark completed</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setChanging({ appt: a, status: 'No-Show' })}><UserX01 /> Mark no-show</DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onSelect={() => setChanging({ appt: a, status: 'Cancelled' })}><XCircle /> Cancel</DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {data.pagination && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPage={setPage} />}
          </>
        )}
      </div>

      {canBook && <BookingDialog open={booking} onOpenChange={setBooking} onSaved={done} />}
      <PrescriptionDialog appointment={prescribing} onOpenChange={(o) => !o && setPrescribing(null)} onSaved={done} />
      <NotesDialog appt={noting} onClose={() => setNoting(null)} onSaved={done} />
      <ConfirmDialog open={Boolean(changing)} onOpenChange={(o) => !o && setChanging(null)} onConfirm={setStatus}
        destructive={changing?.status === 'Cancelled'} confirmLabel={changing?.status === 'Cancelled' ? 'Cancel appointment' : `Mark ${changing?.status.toLowerCase()}`}
        title={changing?.status === 'Cancelled' ? 'Cancel this appointment?' : `Mark as ${changing?.status.toLowerCase()}?`}
        description={changing ? `${formatDate(changing.appt.appointmentDate)} at ${changing.appt.appointmentTime}${changing.status === 'Cancelled' ? ' — the other party will be notified.' : ''}` : undefined} />
    </>
  );
}

function NotesDialog({ appt, onClose, onSaved }: { appt: Appointment | null; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setNotes(appt?.notes ?? ''), [appt]);
  if (!appt) return null;
  const save = async () => {
    setBusy(true);
    try { const r = await api.patch(`/appointments/${appt._id}/notes`, { notes }); toast.success(r.data.message); onSaved(); onClose(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Diagnosis notes</DialogTitle><DialogDescription>{personName(appt.patient)} · {formatDate(appt.appointmentDate)}</DialogDescription></DialogHeader>
        <Field label="Notes"><Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save notes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
