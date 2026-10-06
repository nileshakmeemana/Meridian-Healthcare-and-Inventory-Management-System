'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash01 } from '@untitledui/icons';
import { api } from '@/lib/api';
import { apiError, formatDate, personName } from '@/lib/utils';
import type { Appointment } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from './field';
import { MedicineCombobox } from './medicine-combobox';

interface Item { medicineId: string; quantity: string; dosage: string; frequency: string; durationDays: string; instructions: string }
const blankItem = (): Item => ({ medicineId: '', quantity: '1', dosage: '', frequency: '', durationDays: '', instructions: '' });

/** sp_create_prescription — writes the prescription and completes the appointment in one transaction */
export function PrescriptionDialog({ appointment, onOpenChange, onSaved }: { appointment: Appointment | null; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDiagnosis(''); setNotes(appointment?.notes ?? ''); setValidDays('30'); setItems([blankItem()]); }, [appointment]);
  if (!appointment) return null;

  const update = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    const lines = items.filter((i) => i.medicineId);
    if (!diagnosis.trim()) { toast.error('Diagnosis is required'); return; }
    if (!lines.length) { toast.error('Add at least one medicine'); return; }
    setBusy(true);
    try {
      const res = await api.post('/prescriptions', { appointmentId: appointment._id, diagnosis, notes, validDays: Number(validDays) || 30, items: lines.map((l) => ({ ...l, quantity: Number(l.quantity) || 1 })) });
      toast.success(res.data.message); onSaved(); onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Prescribe & complete visit</DialogTitle>
          <DialogDescription>{personName(appointment.patient)} · {formatDate(appointment.appointmentDate)} at {appointment.appointmentTime}{appointment.reason ? ` · ${appointment.reason}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Diagnosis" className="sm:col-span-3"><Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute bronchitis" /></Field>
          <Field label="Valid for (days)"><Input type="number" min="1" value={validDays} onChange={(e) => setValidDays(e.target.value)} /></Field>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700">Medicines</p>
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-200/70 bg-[#fafbfc] p-3 sm:grid-cols-12">
              <div className="sm:col-span-5"><MedicineCombobox value={it.medicineId} onChange={(id) => update(i, { medicineId: id })} exclude={items.map((x) => x.medicineId)} /></div>
              <Input className="sm:col-span-2" type="number" min="1" value={it.quantity} onChange={(e) => update(i, { quantity: e.target.value })} aria-label="Quantity" placeholder="Qty" />
              <Input className="sm:col-span-2" value={it.dosage} onChange={(e) => update(i, { dosage: e.target.value })} placeholder="1 tablet" aria-label="Dosage" />
              <Input className="sm:col-span-2" value={it.frequency} onChange={(e) => update(i, { frequency: e.target.value })} placeholder="3× daily" aria-label="Frequency" />
              <Button className="sm:col-span-1" variant="ghost" size="icon-sm" aria-label="Remove" disabled={items.length === 1} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}><Trash01 /></Button>
              <Input className="sm:col-span-3" type="number" min="1" value={it.durationDays} onChange={(e) => update(i, { durationDays: e.target.value })} placeholder="Days" aria-label="Duration in days" />
              <Input className="sm:col-span-9" value={it.instructions} onChange={(e) => update(i, { instructions: e.target.value })} placeholder="Instructions, e.g. after meals" aria-label="Instructions" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((xs) => [...xs, blankItem()])}><Plus /> Add medicine</Button>
        </div>
        <Field label="Clinical notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Findings, advice, follow-up plan" /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? 'Issuing…' : 'Issue prescription'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
