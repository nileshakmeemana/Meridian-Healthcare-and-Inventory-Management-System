'use client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Truck01, PackageCheck, XClose, Send01 } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { useApi, useUrlFlag, useUrlParam } from '@/lib/hooks';
import { apiError, formatDate, formatLKR, formatNumber, shortId, toISODate } from '@/lib/utils';
import type { MedicineRequest, SupplyOrder } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { StatTile } from '@/components/dashboard/metric-card';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { Field } from '@/components/forms/field';
import { MedicineCombobox, invalidateCatalogue } from '@/components/forms/medicine-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STATUSES = ['all', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];
type Change = { order: SupplyOrder; status: 'Delivered' | 'Cancelled' | 'Shipped' };

export default function SupplyOrdersPage() {
  return <RoleGate roles={['admin', 'pharmacist', 'supplier']}><Orders /></RoleGate>;
}

function Orders() {
  const role = useAuth((s) => s.user!.role);
  const refreshCounts = useCounts((s) => s.refresh);
  const presetStatus = useUrlParam('status');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  useEffect(() => { if (presetStatus) setStatus(presetStatus); }, [presetStatus]);

  const { data, loading, error, reload } = useApi(() => get<SupplyOrder[]>('/supply-orders', { status: status === 'all' ? undefined : status }), [status]);
  const rows = useMemo(() => (data ?? []).filter((o) => `${o.medicine?.name} ${o.supplier?.companyName} ${o.batchNumber}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const totals = useMemo(() => {
    const all = data ?? [];
    return {
      transit: all.filter((o) => o.status === 'Shipped' || o.status === 'Pending').length,
      delivered: all.filter((o) => o.status === 'Delivered').reduce((s, o) => s + (o.totalCost ?? 0), 0),
      units: all.filter((o) => o.status === 'Delivered').reduce((s, o) => s + o.quantity, 0),
    };
  }, [data]);

  const [creating, setCreating] = useUrlFlag('new');
  const [change, setChange] = useState<Change | null>(null);
  const done = () => { reload(); refreshCounts(role); invalidateCatalogue(); };

  const runChange = async () => {
    try {
      const res = await api.patch(`/supply-orders/${change!.order._id}/status`, { status: change!.status });
      toast.success(res.data.message); done();
    } catch (e) { toast.error(apiError(e)); throw e; }
  };

  return (
    <>
      <PageHeader title={role === 'supplier' ? 'Supply Orders' : 'Purchase Orders'}
        description={role === 'supplier' ? 'Medicines you have dispatched to the hospital' : 'Deliveries from suppliers — confirming receipt fires trg_supply_update_stock'}
        actions={role === 'supplier' ? <Button onClick={() => setCreating(true)}><Plus /> Dispatch supply</Button> : undefined} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={Truck01} tone="blue" label="Awaiting receipt" value={totals.transit} hint="Pending or shipped" />
        <StatTile icon={PackageCheck} tone="slate" label="Units delivered" value={formatNumber(totals.units)} hint="In the current list" />
        <StatTile icon={Send01} tone="amber" label="Delivered value" value={formatLKR(totals.delivered, { compact: true })} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={status} onValueChange={setStatus}><TabsList>{STATUSES.map((s) => <TabsTrigger key={s} value={s}>{s === 'all' ? 'All' : s}</TabsTrigger>)}</TabsList></Tabs>
          <SearchInput value={q} onChange={setQ} placeholder="Medicine, supplier or batch…" />
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Truck01} title="No orders here" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Medicine</TableHead>{role !== 'supplier' && <TableHead>Supplier</TableHead>}<TableHead>Batch / Expiry</TableHead><TableHead>Qty</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((o) => {
                const open = o.status === 'Pending' || o.status === 'Shipped';
                return (
                  <TableRow key={o._id}>
                    <TableCell><p className="font-mono text-[11px] text-slate-600">PO-{shortId(o._id)}</p><p className="text-[10px] text-slate-400">{formatDate(o.suppliedDate)}</p></TableCell>
                    <TableCell><p className="font-bold text-slate-900">{o.medicine?.name}</p><p className="text-[10px] text-slate-400">{o.medicine?.sku}{o.request ? ' · against a request' : ''}</p></TableCell>
                    {role !== 'supplier' && <TableCell className="text-slate-600">{o.supplier?.companyName}</TableCell>}
                    <TableCell><p className="font-mono text-[11px] text-slate-600">{o.batchNumber ?? '—'}</p><p className="text-[10px] text-slate-400">{formatDate(o.expiryDate)}</p></TableCell>
                    <TableCell className="font-bold text-slate-900">{formatNumber(o.quantity)} {o.medicine?.unit}</TableCell>
                    <TableCell className="text-slate-600"><p>{formatLKR(o.totalCost)}</p><p className="text-[10px] text-slate-400">@ {formatLKR(o.unitCost)}</p></TableCell>
                    <TableCell><StatusDot tone={STATUS_TONE[o.status]}>{o.status}</StatusDot>{o.receivedBy && <p className="mt-0.5 text-[10px] text-slate-400">by {o.receivedBy.username}</p>}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {open && role !== 'supplier' && <Button size="sm" onClick={() => setChange({ order: o, status: 'Delivered' })}><PackageCheck /> Confirm receipt</Button>}
                        {o.status === 'Pending' && role === 'supplier' && <Button size="sm" onClick={() => setChange({ order: o, status: 'Shipped' })}><Truck01 /> Mark shipped</Button>}
                        {open && <Button size="sm" variant="outline" onClick={() => setChange({ order: o, status: 'Cancelled' })}><XClose /> Cancel</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {role === 'supplier' && <DispatchDialog open={creating} onOpenChange={setCreating} onSaved={done} />}
      <ConfirmDialog open={Boolean(change)} onOpenChange={(o) => !o && setChange(null)} onConfirm={runChange}
        destructive={change?.status === 'Cancelled'}
        confirmLabel={change?.status === 'Delivered' ? 'Confirm receipt' : change?.status === 'Shipped' ? 'Mark shipped' : 'Cancel order'}
        title={change?.status === 'Delivered' ? 'Confirm this delivery?' : change?.status === 'Shipped' ? 'Mark as shipped?' : 'Cancel this order?'}
        description={change ? (change.status === 'Delivered'
          ? `${formatNumber(change.order.quantity)} ${change.order.medicine?.unit ?? 'units'} of ${change.order.medicine?.name} will be added to stock by the supply trigger, and any linked request marked fulfilled.`
          : `${change.order.medicine?.name} · ${formatNumber(change.order.quantity)} units`) : undefined} />
    </>
  );
}

function DispatchDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const presetRequest = useUrlParam('request');
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [requestId, setRequestId] = useState('none');
  const [f, setF] = useState({ medicineId: '', quantity: '', unitCost: '', batchNumber: '', expiryDate: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    get<MedicineRequest[]>('/requests').then((rs) => setRequests(rs.filter((r) => r.status === 'Pending' || r.status === 'Approved'))).catch(() => {});
  }, [open]);
  useEffect(() => { if (presetRequest) setRequestId(presetRequest); }, [presetRequest]);
  useEffect(() => {
    const r = requests.find((x) => x._id === requestId);
    if (r) setF((s) => ({ ...s, medicineId: r.medicine?._id ?? s.medicineId, quantity: String(r.quantityRequested) }));
  }, [requestId, requests]);

  const save = async () => {
    if (!f.medicineId) { toast.error('Choose the medicine you are shipping'); return; }
    if (!(Number(f.quantity) > 0) || !(Number(f.unitCost) >= 0) || f.unitCost === '') { toast.error('Enter quantity and unit cost'); return; }
    setBusy(true);
    try {
      const res = await api.post('/supply-orders', { ...f, quantity: Number(f.quantity), unitCost: Number(f.unitCost), requestId: requestId === 'none' ? undefined : requestId, expiryDate: f.expiryDate || undefined });
      toast.success(res.data.message);
      setF({ medicineId: '', quantity: '', unitCost: '', batchNumber: '', expiryDate: '', notes: '' }); setRequestId('none');
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Dispatch a supply</DialogTitle>
          <DialogDescription>The pharmacy is notified; stock increases when they confirm receipt.</DialogDescription>
        </DialogHeader>
        <Field label="Against request">
          <Select value={requestId} onValueChange={setRequestId}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No request (unsolicited supply)</SelectItem>
              {requests.map((r) => <SelectItem key={r._id} value={r._id}>{r.medicine?.name ?? r.medicineName} · {r.quantityRequested} · {r.priority}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Medicine"><MedicineCombobox value={f.medicineId} onChange={(id) => set('medicineId')(id)} showStock={false} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity"><Input type="number" min="1" value={f.quantity} onChange={(e) => set('quantity')(e.target.value)} /></Field>
          <Field label="Unit cost (Rs.)"><Input type="number" min="0" step="0.01" value={f.unitCost} onChange={(e) => set('unitCost')(e.target.value)} /></Field>
          <Field label="Batch number"><Input value={f.batchNumber} onChange={(e) => set('batchNumber')(e.target.value)} placeholder="BTH-2026-…" /></Field>
          <Field label="Expiry date"><Input type="date" min={toISODate()} value={f.expiryDate} onChange={(e) => set('expiryDate')(e.target.value)} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes')(e.target.value)} /></Field>
        {f.quantity && f.unitCost && <p className="text-right text-xs text-slate-500">Total cost (computed by a pre-validate hook): <span className="font-bold text-slate-900">{formatLKR(Number(f.quantity) * Number(f.unitCost))}</span></p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? 'Dispatching…' : 'Dispatch'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
