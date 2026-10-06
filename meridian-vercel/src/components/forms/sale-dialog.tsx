'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash01 } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { apiError, formatLKR, personName } from '@/lib/utils';
import { DEPARTMENTS, PAYMENT_METHODS } from '@/lib/constants';
import type { Patient } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from './field';
import { MedicineCombobox, invalidateCatalogue, useMedicineCatalogue } from './medicine-combobox';

interface Line { medicineId: string; quantity: string }

/** sp_issue_medicine — one transaction validates every line, decrements stock and records the sale */
export function SaleDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const catalogue = useMedicineCatalogue();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('walk-in');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [payment, setPayment] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ medicineId: '', quantity: '1' }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPatientId('walk-in'); setDepartment(DEPARTMENTS[0]); setPayment('Cash'); setNotes(''); setLines([{ medicineId: '', quantity: '1' }]);
    if (!patients.length) get<Patient[]>('/patients').then(setPatients).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const med = (id: string) => catalogue.find((m) => m._id === id);
  const total = lines.reduce((s, l) => s + (med(l.medicineId)?.unitPrice ?? 0) * (Number(l.quantity) || 0), 0);
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = async () => {
    const items = lines.filter((l) => l.medicineId).map((l) => ({ medicineId: l.medicineId, quantity: Number(l.quantity) }));
    if (!items.length) { toast.error('Add at least one medicine'); return; }
    const short = items.find((i) => (med(i.medicineId)?.stockQuantity ?? 0) < i.quantity);
    if (short) { toast.error(`Only ${med(short.medicineId)?.stockQuantity} ${med(short.medicineId)?.unit} of ${med(short.medicineId)?.name} left`); return; }
    setBusy(true);
    try {
      const res = await api.post('/sales', { items, patientId: patientId === 'walk-in' ? undefined : patientId, department, paymentMethod: payment, notes: notes || undefined });
      toast.success(res.data.message);
      invalidateCatalogue(); onSaved(); onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record a dispensation</DialogTitle>
          <DialogDescription>Stock is checked and decremented atomically; crossing a reorder level raises the low-stock trigger.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Patient">
            <Select value={patientId} onValueChange={setPatientId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="walk-in">Walk-in / ward</SelectItem>{patients.map((p) => <SelectItem key={p._id} value={p._id}>{personName(p)}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Department">
            <Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Payment">
            <Select value={payment} onValueChange={setPayment}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Items</p>
          {lines.map((l, i) => {
            const m = med(l.medicineId);
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1"><MedicineCombobox value={l.medicineId} onChange={(id) => update(i, { medicineId: id })} exclude={lines.map((x) => x.medicineId)} /></div>
                <Input type="number" min="1" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} className="w-24" aria-label="Quantity" />
                <span className="w-28 text-right text-xs font-bold text-slate-900">{m ? formatLKR(m.unitPrice * (Number(l.quantity) || 0)) : '—'}</span>
                <Button variant="ghost" size="icon-sm" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash01 /></Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { medicineId: '', quantity: '1' }])}><Plus /> Add item</Button>
        </div>

        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
        <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <span className="text-xs font-semibold text-brand-800">Total</span>
          <span className="text-lg font-extrabold text-brand-900">{formatLKR(total)}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? 'Recording…' : 'Record sale'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
