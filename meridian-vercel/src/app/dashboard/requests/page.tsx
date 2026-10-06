'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Inbox01, Check, XClose, PackageCheck, Truck01 } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { useApi, useUrlFlag, useUrlParam } from '@/lib/hooks';
import { apiError, formatDate, formatNumber, timeAgo } from '@/lib/utils';
import { PRIORITIES } from '@/lib/constants';
import type { MedicineRequest, Supplier } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { StatusDot, STATUS_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { PRIORITY_VARIANT } from '@/components/home/supplier-home';
import { Field } from '@/components/forms/field';
import { MedicineCombobox } from '@/components/forms/medicine-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Decision = 'Approved' | 'Rejected' | 'Fulfilled';
const STATUSES = ['all', 'Pending', 'Approved', 'Fulfilled', 'Rejected'];

export default function RequestsPage() {
  return <RoleGate roles={['admin', 'doctor', 'pharmacist', 'supplier']}><Requests /></RoleGate>;
}

function Requests() {
  const user = useAuth((s) => s.user!);
  const role = user.role;
  const refreshCounts = useCounts((s) => s.refresh);
  const [status, setStatus] = useState(role === 'supplier' ? 'Pending' : 'all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useApi(() => get<MedicineRequest[]>('/requests', { status: status === 'all' ? undefined : status, type: type === 'all' ? undefined : type }), [status, type]);
  const rows = useMemo(() => (data ?? []).filter((r) => `${r.medicine?.name ?? r.medicineName} ${r.reason} ${r.requestedBy?.username}`.toLowerCase().includes(q.toLowerCase())), [data, q]);

  const [creating, setCreating] = useUrlFlag('new');
  const [responding, setResponding] = useState<{ req: MedicineRequest; decision: Decision } | null>(null);
  const canCreate = role === 'doctor' || role === 'pharmacist';
  const done = () => { reload(); refreshCounts(role); };

  const actionsFor = (r: MedicineRequest) => {
    if (r.status === 'Fulfilled' || r.status === 'Rejected') return null;
    const btn = (decision: Decision, label: string, Icon: typeof Check, variant: 'outline' | 'default' = 'outline') => (
      <Button key={decision} size="sm" variant={variant} onClick={() => setResponding({ req: r, decision })}><Icon /> {label}</Button>
    );
    if (r.requestType === 'Internal' && (role === 'pharmacist' || role === 'admin')) {
      return [r.status === 'Pending' && btn('Approved', 'Approve', Check), btn('Fulfilled', 'Fulfil', PackageCheck, 'default'), btn('Rejected', 'Reject', XClose)];
    }
    if (r.requestType === 'External' && (role === 'supplier' || role === 'admin')) {
      if (r.status === 'Pending') return [btn('Approved', 'Accept', Check, 'default'), btn('Rejected', 'Decline', XClose)];
      if (role === 'supplier') return <Button size="sm" asChild><Link href={`/dashboard/supply-orders?new=1&request=${r._id}`}><Truck01 /> Dispatch</Link></Button>;
    }
    return null;
  };

  return (
    <>
      <PageHeader
        title={role === 'supplier' ? 'Restock Requests' : 'Requisitions'}
        description={role === 'doctor' ? 'Ask the pharmacy for medicines your patients need' : role === 'supplier' ? 'Requests from the hospital pharmacy — accept one, then dispatch it' : 'Internal requests from doctors and external restock orders to suppliers'}
        actions={canCreate ? <Button onClick={() => setCreating(true)}><Plus /> {role === 'doctor' ? 'Request medicine' : 'New restock request'}</Button> : undefined}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>{STATUSES.map((s) => <TabsTrigger key={s} value={s}>{s === 'all' ? 'All' : s}</TabsTrigger>)}</TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={q} onChange={setQ} placeholder="Medicine, reason or requester…" />
            {(role === 'admin' || role === 'pharmacist') && (
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-44 text-xs font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="Internal">Internal (doctors)</SelectItem><SelectItem value="External">External (suppliers)</SelectItem></SelectContent>
              </Select>
            )}
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : rows.length === 0 ? (
          <EmptyState icon={Inbox01} title="No requests here" description="Requests appear as soon as they are raised." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Priority</TableHead><TableHead>Type</TableHead><TableHead>Requested</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="max-w-72">
                    <p className="font-bold text-slate-900">{r.medicine?.name ?? r.medicineName}</p>
                    <p className="truncate text-[11px] text-slate-500">{r.reason || 'No reason given'}</p>
                    {r.medicine && role !== 'supplier' && <p className="text-[10px] text-slate-400">In stock: {formatNumber(r.medicine.stockQuantity)} {r.medicine.unit} · reorder at {r.medicine.reorderLevel}</p>}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">{formatNumber(r.quantityRequested)}</TableCell>
                  <TableCell><Badge variant={PRIORITY_VARIANT[r.priority]}>{r.priority}</Badge></TableCell>
                  <TableCell className="text-slate-600">
                    <p>{r.requestType === 'Internal' ? 'Doctor → Pharmacy' : 'Pharmacy → Supplier'}</p>
                    {r.supplier && <p className="text-[10px] text-slate-400">{r.supplier.companyName}</p>}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <p>{formatDate(r.createdAt)}</p>
                    <p className="text-[10px] text-slate-400">{r.requestedBy?.username} · {timeAgo(r.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <StatusDot tone={STATUS_TONE[r.status]}>{r.status}</StatusDot>
                    {r.responseNotes && <p className="mt-0.5 max-w-44 truncate text-[10px] text-slate-400" title={r.responseNotes}>“{r.responseNotes}”</p>}
                  </TableCell>
                  <TableCell><div className="flex justify-end gap-2">{actionsFor(r)}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {canCreate && <RequestDialog open={creating} onOpenChange={setCreating} role={role} onSaved={done} />}
      <RespondDialog state={responding} onClose={() => setResponding(null)} onSaved={done} />
    </>
  );
}

function RequestDialog({ open, onOpenChange, role, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; role: string; onSaved: () => void }) {
  const preset = useUrlParam('medicine');
  const [medicineId, setMedicineId] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [qty, setQty] = useState('');
  const [priority, setPriority] = useState<string>('Normal');
  const [reason, setReason] = useState('');
  const [supplierId, setSupplierId] = useState('any');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (preset) setMedicineId(preset); }, [preset]);
  useEffect(() => {
    if (open && role === 'pharmacist' && !suppliers.length) get<Supplier[]>('/suppliers').then(setSuppliers).catch(() => {});
  }, [open, role, suppliers.length]);

  const save = async () => {
    if (!medicineId && !medicineName.trim()) { toast.error('Pick a medicine or type its name'); return; }
    if (!(Number(qty) > 0)) { toast.error('Enter a quantity'); return; }
    setBusy(true);
    try {
      const res = await api.post('/requests', { medicineId: medicineId || undefined, medicineName: medicineName || undefined, quantityRequested: Number(qty), priority, reason, supplierId: supplierId === 'any' ? undefined : supplierId });
      toast.success(res.data.message);
      setMedicineId(''); setMedicineName(''); setQty(''); setReason(''); setPriority('Normal');
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role === 'doctor' ? 'Request a medicine' : 'Restock request to suppliers'}</DialogTitle>
          <DialogDescription>{role === 'doctor' ? 'The pharmacy team is notified straight away.' : 'Pick one supplier or broadcast it to all of them.'}</DialogDescription>
        </DialogHeader>
        <Field label="Medicine"><MedicineCombobox value={medicineId} onChange={(id) => setMedicineId(id)} /></Field>
        {!medicineId && <Field label="…or a new item not yet in the catalogue"><Input value={medicineName} onChange={(e) => setMedicineName(e.target.value)} placeholder="e.g. Rituximab 500mg" /></Field>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity"><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Priority">
            <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          </Field>
        </div>
        {role === 'pharmacist' && (
          <Field label="Supplier">
            <Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="any">Any supplier (broadcast)</SelectItem>{suppliers.map((s) => <SelectItem key={s._id} value={s._id}>{s.companyName}</SelectItem>)}</SelectContent></Select>
          </Field>
        )}
        <Field label="Reason"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Clinical need or stock situation" /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? 'Sending…' : 'Send request'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RespondDialog({ state, onClose, onSaved }: { state: { req: MedicineRequest; decision: Decision } | null; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setNotes(''), [state]);
  if (!state) return null;
  const { req, decision } = state;
  const verb = { Approved: 'Approve', Rejected: 'Reject', Fulfilled: 'Mark as fulfilled' }[decision];
  const save = async () => {
    setBusy(true);
    try { const res = await api.patch(`/requests/${req._id}/respond`, { decision, notes: notes || undefined }); toast.success(res.data.message); onSaved(); onClose(); }
    catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{verb} request?</DialogTitle>
          <DialogDescription>{formatNumber(req.quantityRequested)} × {req.medicine?.name ?? req.medicineName}. The requester gets a notification.</DialogDescription>
        </DialogHeader>
        <Field label="Note to requester"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={decision === 'Rejected' ? 'Why it can’t go ahead' : 'Optional'} /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={decision === 'Rejected' ? 'destructive' : 'default'} disabled={busy} onClick={save}>{busy ? 'Saving…' : verb}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
