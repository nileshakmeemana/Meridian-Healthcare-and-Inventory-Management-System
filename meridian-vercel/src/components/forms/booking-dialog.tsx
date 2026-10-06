'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, get } from '@/lib/api';
import { useUrlParam } from '@/lib/hooks';
import { apiError, cn, formatLKR, personName, toISODate } from '@/lib/utils';
import type { Doctor, Patient } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from './field';

interface Availability { worksThatDay: boolean; availableDays: string[]; slots: { time: string; available: boolean }[] }

/** sp_book_appointment — checks the doctor's days, past dates and slot clashes inside a transaction */
export function BookingDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const user = useAuth((s) => s.user!);
  const presetDoctor = useUrlParam('doctor');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorId, setDoctorId] = useState(user.role === 'doctor' ? user.profileId ?? '' : '');
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(toISODate());
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [avail, setAvail] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const needsPatient = user.role !== 'patient';

  useEffect(() => { if (presetDoctor) setDoctorId(presetDoctor); }, [presetDoctor]);
  useEffect(() => {
    if (!open) return;
    if (!doctors.length) get<Doctor[]>('/doctors').then(setDoctors).catch(() => {});
    if (needsPatient && !patients.length) get<Patient[]>('/patients').then(setPatients).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTime(''); setAvail(null);
    if (!open || !doctorId || !date) return;
    get<Availability>('/appointments/availability', { doctorId, date }).then(setAvail).catch(() => setAvail(null));
  }, [open, doctorId, date]);

  const doctor = doctors.find((d) => d._id === doctorId);
  const save = async () => {
    if (!doctorId || !time || (needsPatient && !patientId)) { toast.error('Choose a doctor, patient and time slot'); return; }
    setBusy(true);
    try {
      const res = await api.post('/appointments', { doctorId, date, time, reason, patientId: needsPatient ? patientId : undefined });
      toast.success(res.data.message);
      setTime(''); setReason('');
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>Slots already taken or outside the doctor&apos;s consulting days are disabled.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {user.role !== 'doctor' && (
            <Field label="Doctor" className={needsPatient ? '' : 'sm:col-span-2'}>
              <Select value={doctorId} onValueChange={setDoctorId}><SelectTrigger><SelectValue placeholder="Choose a doctor" /></SelectTrigger>
                <SelectContent>{doctors.map((d) => <SelectItem key={d._id} value={d._id}>{personName(d, 'Dr. ')} · {d.specialization}</SelectItem>)}</SelectContent></Select>
            </Field>
          )}
          {needsPatient && (
            <Field label="Patient" className={user.role === 'doctor' ? 'sm:col-span-2' : ''}>
              <Select value={patientId} onValueChange={setPatientId}><SelectTrigger><SelectValue placeholder="Choose a patient" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p._id} value={p._id}>{personName(p)}{p.phone ? ` · ${p.phone}` : ''}</SelectItem>)}</SelectContent></Select>
            </Field>
          )}
        </div>
        {doctor && <p className="-mt-2 text-[11px] text-slate-500">Consults {doctor.availableDays.join(', ')} · fee {formatLKR(doctor.consultationFee)}{doctor.room ? ` · ${doctor.room}` : ''}</p>}
        <Field label="Date"><Input type="date" min={toISODate()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid gap-1.5">
          <p className="text-xs font-semibold text-slate-700">Time slot</p>
          {!doctorId ? <p className="text-xs text-slate-400">Pick a doctor first.</p> : !avail ? <Skeleton className="h-20 w-full" /> : !avail.worksThatDay ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Not consulting that day. Available: {avail.availableDays.join(', ')}.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {avail.slots.map((s) => (
                <button key={s.time} type="button" disabled={!s.available} onClick={() => setTime(s.time)}
                  className={cn('rounded-lg border px-2 py-1.5 text-xs font-semibold transition', time === s.time ? 'border-brand-800 bg-brand-800 text-white' : s.available ? 'border-slate-200 bg-white text-slate-700 hover:border-brand-500' : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through')}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label="Reason for visit"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Symptoms or follow-up" /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !time} onClick={save}>{busy ? 'Booking…' : 'Book appointment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
