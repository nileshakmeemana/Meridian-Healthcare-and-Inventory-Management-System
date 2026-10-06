'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, DotsHorizontal, Edit05, ClockRewind, Trash01, SwitchVertical01, Inbox01, Package } from '@untitledui/icons';
import { api } from '@/lib/api';
import { useApi, useDebounced, useUrlFlag } from '@/lib/hooks';
import { apiError, formatDate, formatLKR, formatNumber, cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import type { Medicine } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { Pagination } from '@/components/dashboard/pagination';
import { StatusDot, STOCK_LABEL, STOCK_TONE } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { MedicineFormDialog, StockDialog, HistoryDialog } from '@/components/forms/medicine-dialogs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pill } from '@/components/icons/pill';

const STATUS_TABS = [
  { value: 'all', label: 'All items' },
  { value: 'Low,Critical,Expired', label: 'Needs attention' },
  { value: 'Low', label: 'Low' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Expired', label: 'Expired' },
];
const TILE: Record<string, string> = { Normal: 'bg-emerald-100 text-emerald-700', Low: 'bg-amber-100 text-amber-700', Critical: 'bg-rose-100 text-rose-600', Expired: 'bg-rose-100 text-rose-600' };

export default function MedicinesPage() {
  return <RoleGate roles={['admin', 'pharmacist', 'doctor']}><Medicines /></RoleGate>;
}

function Medicines() {
  const role = useAuth((s) => s.user!.role);
  const refreshCounts = useCounts((s) => s.refresh);
  const canEdit = role === 'admin' || role === 'pharmacist';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const q = useDebounced(search);

  // Deep links from the sidebar search, Department Stock tiles and the featured card
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) setSearch(p.get('q')!);
    if (p.get('category')) setCategory(p.get('category')!);
    if (p.get('status')) setStatus(p.get('status')!);
    setReady(true);
  }, []);
  useEffect(() => setPage(1), [q, category, status]);

  const { data, loading, error, reload } = useApi(async () => {
    if (!ready) return null;
    const res = await api.get('/medicines', { params: { search: q || undefined, category: category === 'all' ? undefined : category, status: status === 'all' ? undefined : status, page, limit: 15 } });
    return { rows: res.data.data as Medicine[], pagination: res.data.pagination };
  }, [q, category, status, page, ready]);

  const [creating, setCreating] = useUrlFlag('new');
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [stock, setStock] = useState<Medicine | null>(null);
  const [history, setHistory] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState<Medicine | null>(null);
  const saved = () => { reload(); refreshCounts(role); };

  return (
    <>
      <PageHeader title={canEdit ? 'Pharmacy Stock' : 'Medicine Catalogue'}
        description={<>Inventory read from the <span className="font-mono">vw_medicine_stock_report</span> view, with computed status, value and 30-day usage</>}
        actions={canEdit ? <Button onClick={() => setCreating(true)}><Plus /> Add medicine</Button> : <Button variant="outline" asChild><Link href="/dashboard/requests?new=1"><Inbox01 /> Request medicine</Link></Button>} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>{STATUS_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Name, generic, SKU or batch…" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48 text-xs font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <TableSkeleton rows={8} /> : data.rows.length === 0 ? (
          <EmptyState icon={Package} title="No medicines match" description="Clear the search or pick another category." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medical Item / Drug</TableHead><TableHead>Category</TableHead><TableHead>Batch ID</TableHead>
                  <TableHead>Expiry Date</TableHead><TableHead>In Stock</TableHead><TableHead>Unit Price</TableHead>
                  <TableHead>Used (30d)</TableHead><TableHead>Status</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', TILE[m.stockStatus])}><Pill className="size-3.5" /></div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold text-slate-900">{m.name}{m.requiresPrescription && <Badge variant="purple">Rx</Badge>}</p>
                          <p className="text-[10px] text-slate-400">{m.sku}{m.genericName ? ` · ${m.genericName}` : ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{m.category}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600">{m.batchNumber ?? '—'}</TableCell>
                    <TableCell className="text-slate-600">
                      <p>{formatDate(m.expiryDate)}</p>
                      {m.daysUntilExpiry != null && m.daysUntilExpiry <= 90 && (
                        <p className={cn('text-[10px] font-semibold', m.daysUntilExpiry < 0 ? 'text-rose-600' : 'text-amber-600')}>{m.daysUntilExpiry < 0 ? `${-m.daysUntilExpiry}d ago` : `in ${m.daysUntilExpiry}d`}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900">{formatNumber(m.stockQuantity)} {m.unit}</p>
                      <p className="text-[10px] text-slate-400">Reorder at {m.reorderLevel}</p>
                    </TableCell>
                    <TableCell className="text-slate-600">{formatLKR(m.unitPrice)}</TableCell>
                    <TableCell className="text-slate-600">{formatNumber(m.soldLast30Days)}</TableCell>
                    <TableCell><StatusDot tone={STOCK_TONE[m.stockStatus]}>{STOCK_LABEL[m.stockStatus]}</StatusDot></TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label={`Actions for ${m.name}`} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><DotsHorizontal className="size-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setStock(m)}><SwitchVertical01 /> Adjust stock</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditing(m)}><Edit05 /> Edit details</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setHistory(m)}><ClockRewind /> Stock history</DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/dashboard/requests?new=1&medicine=${m._id}`}><Inbox01 /> Request restock</Link></DropdownMenuItem>
                            {role === 'admin' && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setDeleting(m)}><Trash01 /> Delete</DropdownMenuItem></>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="outline" size="sm" asChild><Link href={`/dashboard/requests?new=1&medicine=${m._id}`}>Request</Link></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.pagination && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPage={setPage} />}
          </>
        )}
      </div>

      {canEdit && (
        <>
          <MedicineFormDialog open={creating || Boolean(editing)} medicine={editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }} onSaved={saved} />
          <StockDialog medicine={stock} onOpenChange={(o) => !o && setStock(null)} onSaved={saved} />
          <HistoryDialog medicine={history} onOpenChange={(o) => !o && setHistory(null)} />
          <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} destructive confirmLabel="Delete medicine"
            title={`Delete ${deleting?.name}?`} description="Medicines that appear on sales, prescriptions or supply orders cannot be deleted — the API will refuse."
            onConfirm={async () => { try { const r = await api.delete(`/medicines/${deleting!._id}`); toast.success(r.data.message); saved(); } catch (e) { toast.error(apiError(e)); throw e; } }} />
        </>
      )}
    </>
  );
}
