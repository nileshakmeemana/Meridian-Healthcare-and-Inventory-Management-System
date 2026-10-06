'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { File06, SwitchHorizontal01, Calendar } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { apiError, formatDate, formatLKR, personName, cn } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/lib/constants';
import type { Prescription } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { Field } from '@/components/forms/field';
import { invalidateCatalogue } from '@/components/forms/medicine-combobox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill } from '@/components/icons/pill';

const STATUS_VARIANT = { Active: 'success', Fulfilled: 'gray', Expired: 'error', Cancelled: 'error' } as const;

export default function PrescriptionsPage() {
  return <RoleGate roles={['admin', 'doctor', 'pharmacist', 'patient']}><Prescriptions /></RoleGate>;
}

function Prescriptions() {
  const role = useAuth((s) => s.user!.role);
  const refreshCounts = useCounts((s) => s.refresh);
  const [status, setStatus] = useState(role === 'pharmacist' ? 'Active' : 'all');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useApi(() => get<Prescription[]>('/prescriptions', { status: status === 'all' ? undefined : status }), [status]);
  const rows = useMemo(() => (data ?? []).filter((p) => `${p.diagnosis} ${personName(p.patient)} ${personName(p.doctor)} ${p.items.map((i) => i.medicine?.name).join(' ')}`.toLowerCase().includes(q.toLowerCase())), [data, q]);

  const [dispensing, setDispensing] = useState<Prescription | null>(null);
  const [payment, setPayment] = useState('Cash');
  const total = (p: Prescription) => p.items.reduce((s, i) => s + (i.medicine?.unitPrice ?? 0) * i.quantity, 0);

  const dispense = async () => {
    const p = dispensing!;
    try {
      const r = await api.post('/sales', { prescriptionId: p._id, patientId: p.patient?._id, paymentMethod: payment, department: 'Outpatient Pharmacy',
        items: p.items.map((i) => ({ medicineId: i.medicine._id, quantity: i.quantity })) });
      toast.success(r.data.message); invalidateCatalogue(); reload(); refreshCounts(role);
    } catch (e) { toast.error(apiError(e)); throw e; }
  };

  return (
    <>
      <PageHeader title={role === 'patient' ? 'My Prescriptions' : 'Prescriptions'}
        description={role === 'pharmacist' ? 'Dispense active prescriptions — stock and the prescription status update in one transaction' : role === 'doctor' ? 'Prescriptions you have issued' : role === 'patient' ? 'Show the code at the pharmacy counter to collect' : 'All prescriptions issued at Meridian'} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={setStatus}><TabsList>{['all', 'Active', 'Fulfilled', 'Expired'].map((s) => <TabsTrigger key={s} value={s}>{s === 'all' ? 'All' : s}</TabsTrigger>)}</TabsList></Tabs>
        <SearchInput value={q} onChange={setQ} placeholder="Diagnosis, patient or medicine…" />
      </div>

      {error ? <div className="rounded-2xl border border-slate-200/80 bg-white"><ErrorState message={error} onRetry={reload} /></div> : loading ? <div className="rounded-2xl border border-slate-200/80 bg-white"><TableSkeleton /></div> : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white"><EmptyState icon={File06} title="No prescriptions here" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {rows.map((p) => {
            const short = p.items.some((i) => (i.medicine?.stockQuantity ?? 0) < i.quantity);
            return (
              <div key={p._id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-bold text-slate-900">{p.diagnosis}</h3>
                      <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {role !== 'patient' && <>{personName(p.patient)} · </>}{role !== 'doctor' && <>{personName(p.doctor, 'Dr. ')} · </>}{p.doctor?.specialization}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[11px] font-semibold text-slate-700">RX-{p._id.slice(-6).toUpperCase()}</p>
                    <p className="flex items-center justify-end gap-1 text-[10px] text-slate-400"><Calendar className="size-3" />{formatDate(p.issuedDate)}</p>
                  </div>
                </div>
                <ul className="flex-1 divide-y divide-slate-100 px-5">
                  {p.items.map((i, idx) => (
                    <li key={i._id ?? idx} className="flex items-center gap-3 py-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Pill className="size-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{i.medicine?.name}{i.medicine?.strength ? ` ${i.medicine.strength}` : ''}</p>
                        <p className="truncate text-[11px] text-slate-500">{[i.dosage, i.frequency, i.durationDays && `${i.durationDays} days`, i.instructions].filter(Boolean).join(' · ') || 'As directed'}</p>
                      </div>
                      <span className={cn('text-xs font-bold', role === 'pharmacist' && (i.medicine?.stockQuantity ?? 0) < i.quantity ? 'text-rose-600' : 'text-slate-900')}>× {i.quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
                  <p className="text-[11px] text-slate-500">{p.validUntil ? `Valid until ${formatDate(p.validUntil)}` : ''}{p.notes ? ` · ${p.notes}` : ''}</p>
                  {role === 'pharmacist' && p.status === 'Active' && (
                    <Button size="sm" disabled={short} title={short ? 'Not enough stock for every item' : undefined} onClick={() => { setPayment('Cash'); setDispensing(p); }}>
                      <SwitchHorizontal01 /> Dispense · {formatLKR(total(p))}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={Boolean(dispensing)} onOpenChange={(o) => !o && setDispensing(null)} onConfirm={dispense} confirmLabel="Dispense & record sale"
        title="Dispense this prescription?" description={dispensing ? `${personName(dispensing.patient)} · ${dispensing.items.length} item(s) · ${formatLKR(total(dispensing))}` : undefined}>
        <Field label="Payment method">
          <Select value={payment} onValueChange={setPayment}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        </Field>
      </ConfirmDialog>
    </>
  );
}
