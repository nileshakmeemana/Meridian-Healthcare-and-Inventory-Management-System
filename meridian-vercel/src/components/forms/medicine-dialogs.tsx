'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, get } from '@/lib/api';
import { apiError, formatDate, formatNumber, toISODate, cn } from '@/lib/utils';
import { CATEGORIES, DOSAGE_FORMS, UNITS } from '@/lib/constants';
import type { Medicine, StockMovement } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field } from './field';
import { TableSkeleton, EmptyState } from '@/components/dashboard/states';

type Form = Record<string, string | boolean>;
const blank: Form = {
  name: '', genericName: '', sku: '', category: '', manufacturer: '', unitPrice: '', unit: 'Tablets', stockQuantity: '0',
  reorderLevel: '10', batchNumber: '', expiryDate: '', dosageForm: '', strength: '', requiresPrescription: false, description: '',
};

export function MedicineFormDialog({ open, onOpenChange, medicine, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; medicine?: Medicine | null; onSaved: () => void }) {
  const [f, setF] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(medicine);

  useEffect(() => {
    if (!open) return;
    setF(medicine ? {
      ...blank, ...Object.fromEntries(Object.entries(medicine).map(([k, v]) => [k, typeof v === 'boolean' ? v : v == null ? '' : String(v)])),
      expiryDate: medicine.expiryDate ? toISODate(new Date(medicine.expiryDate)) : '',
    } : blank);
  }, [open, medicine]);

  const set = (k: string) => (v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const txt = (k: string) => ({ value: String(f[k] ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.category) { toast.error('Choose a category'); return; }
    setBusy(true);
    const body = { ...f, unitPrice: Number(f.unitPrice), reorderLevel: Number(f.reorderLevel), stockQuantity: Number(f.stockQuantity) };
    try {
      const res = editing ? await api.put(`/medicines/${medicine!._id}`, body) : await api.post('/medicines', body);
      toast.success(res.data.message);
      onSaved();
      onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${medicine!.name}` : 'Add a medicine or supply'}</DialogTitle>
          <DialogDescription>{editing ? 'Stock levels change through stock adjustments, sales and deliveries.' : 'Opening stock is logged to stock history by the trigger.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Name" className="col-span-2"><Input required {...txt('name')} placeholder="Amoxicillin 500mg" /></Field>
          <Field label="SKU"><Input required {...txt('sku')} placeholder="SKU-ANT-0001" className="uppercase" /></Field>
          <Field label="Generic name"><Input {...txt('genericName')} /></Field>
          <Field label="Category">
            <Select value={String(f.category)} onValueChange={set('category')}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Manufacturer"><Input {...txt('manufacturer')} /></Field>
          <Field label="Dosage form">
            <Select value={String(f.dosageForm)} onValueChange={set('dosageForm')}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DOSAGE_FORMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Strength"><Input {...txt('strength')} placeholder="500mg" /></Field>
          <Field label="Unit">
            <Select value={String(f.unit)} onValueChange={set('unit')}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Unit price (Rs.)"><Input required type="number" min="0" step="0.01" {...txt('unitPrice')} /></Field>
          <Field label="Reorder level"><Input required type="number" min="0" {...txt('reorderLevel')} /></Field>
          {!editing && <Field label="Opening stock"><Input type="number" min="0" {...txt('stockQuantity')} /></Field>}
          <Field label="Batch number"><Input {...txt('batchNumber')} placeholder="BTH-2026-001" /></Field>
          <Field label="Expiry date"><Input type="date" {...txt('expiryDate')} /></Field>
          <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700 sm:col-span-1">
            <Checkbox checked={Boolean(f.requiresPrescription)} onCheckedChange={(c) => set('requiresPrescription')(c === true)} /> Prescription only
          </label>
          <Field label="Description" className="col-span-2 sm:col-span-3"><Textarea rows={2} {...txt('description')} /></Field>
          <DialogFooter className="col-span-2 sm:col-span-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add medicine'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** sp_adjust_medicine_stock — positive adds, negative removes */
export function StockDialog({ medicine, onOpenChange, onSaved }: { medicine: Medicine | null; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMode('add'); setQty(''); setReason(''); }, [medicine]);
  if (!medicine) return null;
  const n = Number(qty) || 0;
  const after = medicine.stockQuantity + (mode === 'add' ? n : -n);

  const save = async () => {
    if (n <= 0) { toast.error('Enter a quantity above zero'); return; }
    setBusy(true);
    try {
      const res = await api.patch(`/medicines/${medicine._id}/stock`, { quantity: mode === 'add' ? n : -n, reason: reason || undefined, changeType: mode === 'add' ? 'Add' : 'Remove' });
      toast.success(res.data.message);
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{medicine.name} · currently {formatNumber(medicine.stockQuantity)} {medicine.unit}</DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList><TabsTrigger value="add">Add stock</TabsTrigger><TabsTrigger value="remove">Remove stock</TabsTrigger></TabsList>
        </Tabs>
        <Field label="Quantity"><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === 'add' ? 'Opening count correction' : 'Damaged / expired / returned'} /></Field>
        <div className={cn('rounded-xl border px-4 py-3 text-xs', after < 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : after <= medicine.reorderLevel ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600')}>
          New level: <span className="font-bold">{formatNumber(after)} {medicine.unit}</span>
          {after < 0 ? ' — that would go below zero.' : after <= medicine.reorderLevel ? ` — at or below the reorder level (${medicine.reorderLevel}); pharmacists will be alerted.` : ''}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={mode === 'remove' ? 'destructive' : 'default'} disabled={busy || after < 0} onClick={save}>{busy ? 'Saving…' : mode === 'add' ? 'Add stock' : 'Remove stock'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TYPE_TONE: Record<string, string> = { Sale: 'text-slate-900', Supply: 'text-emerald-700', Add: 'text-emerald-700', Remove: 'text-rose-600', Adjust: 'text-slate-700' };

export function HistoryDialog({ medicine, onOpenChange }: { medicine: Medicine | null; onOpenChange: (o: boolean) => void }) {
  const [rows, setRows] = useState<StockMovement[] | null>(null);
  useEffect(() => {
    setRows(null);
    if (medicine) get<StockMovement[]>(`/medicines/${medicine._id}/history`).then(setRows).catch(() => setRows([]));
  }, [medicine]);
  if (!medicine) return null;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stock history</DialogTitle>
          <DialogDescription>{medicine.name} · rows written by <span className="font-mono">trg_stock_history_log</span></DialogDescription>
        </DialogHeader>
        {rows === null ? <TableSkeleton rows={4} /> : rows.length === 0 ? <EmptyState title="No movements yet" /> : (
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Change</th><th className="px-4 py-2.5">Level</th><th className="px-4 py-2.5">By / reason</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatDate(r.changedAt, 'dd MMM yy, HH:mm')}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.changeType}</td>
                    <td className={cn('px-4 py-2.5 font-bold', TYPE_TONE[r.changeType])}>{r.quantityChange > 0 ? '+' : ''}{r.quantityChange}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{r.quantityBefore} → {r.quantityAfter}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.changedBy?.username ?? 'system'}{r.reason ? ` · ${r.reason}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
