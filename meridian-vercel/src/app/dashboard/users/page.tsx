'use client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, DotsHorizontal, Edit05, Power01, RefreshCw01, Trash01, ShieldTick, ClockRewind } from '@untitledui/icons';
import { api, get } from '@/lib/api';
import { useApi, useDebounced, useUrlFlag } from '@/lib/hooks';
import { apiError, formatDate, initials, timeAgo } from '@/lib/utils';
import type { AuthUser, Role } from '@/lib/types';
import { RoleGate } from '@/components/layout/role-gate';
import { ROLE_LABEL } from '@/components/layout/nav-config';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { StatusDot } from '@/components/dashboard/status-dot';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { Field } from '@/components/forms/field';
import { ProfileFields, requiredMissing, toFormValues, toPayload, type ProfileValues } from '@/components/forms/profile-fields';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const ROLE_TABS: (Role | 'all')[] = ['all', 'doctor', 'pharmacist', 'supplier', 'patient', 'admin'];
const ROLE_BADGE = { admin: 'error', doctor: 'blue', pharmacist: 'brand', supplier: 'warning', patient: 'gray' } as const;
const CREATABLE: Exclude<Role, 'admin'>[] = ['doctor', 'pharmacist', 'supplier', 'patient'];

interface AuditLog { _id: string; collectionName?: string; action: string; recordId?: string; user?: { username: string; role: string }; createdAt: string }

export default function UsersPage() {
  return <RoleGate roles={['admin']}><Users /></RoleGate>;
}

function Users() {
  const [role, setRole] = useState<Role | 'all'>('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi(() => get<AuthUser[]>('/admin/users', { role: role === 'all' ? undefined : role, status: status === 'all' ? undefined : status, search: q || undefined }), [role, status, q]);

  const [creating, setCreating] = useUrlFlag('new');
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [reroling, setReroling] = useState<AuthUser | null>(null);
  const [toggling, setToggling] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState<AuthUser | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const counts = useMemo(() => ({ active: (data ?? []).filter((u) => u.isActive).length, total: data?.length ?? 0 }), [data]);
  const run = async (fn: () => Promise<{ data: { message: string } }>) => {
    try { const r = await fn(); toast.success(r.data.message); reload(); } catch (e) { toast.error(apiError(e)); throw e; }
  };

  return (
    <>
      <PageHeader title="Users & Roles" description="Create accounts, assign roles and activate or deactivate access"
        actions={<><Button variant="outline" onClick={() => setShowAudit(true)}><ClockRewind /> Audit log</Button><Button onClick={() => setCreating(true)}><Plus /> Add user</Button></>} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role | 'all')}>
            <TabsList>{ROLE_TABS.map((r) => <TabsTrigger key={r} value={r} className="capitalize">{r === 'all' ? 'All users' : `${r}s`}</TabsTrigger>)}</TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Username or email…" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 text-xs font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Any status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton rows={8} /> : !data?.length ? <EmptyState icon={ShieldTick} title="No users match" /> : (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Details</TableHead><TableHead>Last sign-in</TableHead><TableHead>Status</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8"><AvatarFallback>{initials(u.displayName)}</AvatarFallback></Avatar>
                        <div className="min-w-0"><p className="truncate font-bold text-slate-900">{u.displayName}</p><p className="truncate text-[10px] text-slate-400">@{u.username} · {u.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={ROLE_BADGE[u.role]} className="capitalize">{u.role}</Badge></TableCell>
                    <TableCell className="max-w-56 truncate text-slate-600">
                      {u.role === 'doctor' ? `${u.profile?.specialization} · ${u.profile?.licenseNumber}` : u.role === 'pharmacist' ? `${u.profile?.shift ?? ''} shift · ${u.profile?.licenseNumber}` : u.role === 'supplier' ? u.profile?.contactPerson ?? '—' : u.role === 'patient' ? `${u.profile?.gender ?? ''}${u.profile?.phone ? ` · ${u.profile.phone}` : ''}` : 'System administrator'}
                    </TableCell>
                    <TableCell className="text-slate-600">{u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</TableCell>
                    <TableCell><StatusDot tone={u.isActive ? 'emerald' : 'rose'}>{u.isActive ? 'Active' : 'Inactive'}</StatusDot></TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label={`Actions for ${u.username}`} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><DotsHorizontal className="size-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(u)}><Edit05 /> Edit account</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setReroling(u)}><RefreshCw01 /> Change role</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setToggling(u)}><Power01 /> {u.isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(u)}><Trash01 /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">{counts.active} of {counts.total} accounts active</p>
          </>
        )}
      </div>

      <UserDialog open={creating || Boolean(editing)} user={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={reload} />
      <RoleDialog user={reroling} onClose={() => setReroling(null)} onSaved={reload} />
      <AuditDialog open={showAudit} onOpenChange={setShowAudit} />
      <ConfirmDialog open={Boolean(toggling)} onOpenChange={(o) => !o && setToggling(null)} destructive={toggling?.isActive}
        title={`${toggling?.isActive ? 'Deactivate' : 'Activate'} ${toggling?.displayName}?`}
        description={toggling?.isActive ? 'They will be signed out on their next request and cannot sign in until reactivated.' : 'They will be able to sign in again.'}
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'} onConfirm={() => run(() => api.patch(`/admin/users/${toggling!.id}/toggle`))} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} destructive confirmLabel="Delete user"
        title={`Delete ${deleting?.displayName}?`} description="Accounts with appointments, sales or deliveries can't be deleted — deactivate them instead."
        onConfirm={() => run(() => api.delete(`/admin/users/${deleting!.id}`))} />
    </>
  );
}

function UserDialog({ open, user, onClose, onSaved }: { open: boolean; user: AuthUser | null; onClose: () => void; onSaved: () => void }) {
  const editing = Boolean(user);
  const [role, setRole] = useState<Exclude<Role, 'admin'>>('doctor');
  const [account, setAccount] = useState({ username: '', email: '', password: '' });
  const [profile, setProfile] = useState<ProfileValues>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const r = (user?.role ?? 'doctor') as Exclude<Role, 'admin'>;
    setRole(r);
    setAccount({ username: user?.username ?? '', email: user?.email ?? '', password: '' });
    setProfile(toFormValues(r, user?.profile));
  }, [open, user]);

  const save = async () => {
    const missing = requiredMissing(role, profile);
    if (missing) { toast.error(`${missing} is required`); return; }
    if (!editing && account.password.length < 8) { toast.error('Temporary password needs at least 8 characters'); return; }
    setBusy(true);
    try {
      const body = { ...account, password: account.password || undefined, role, profile: toPayload(role, profile) };
      const r = editing ? await api.put(`/admin/users/${user!.id}`, body) : await api.post('/admin/users', body);
      toast.success(r.data.message); onSaved(); onClose();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${user!.displayName}` : 'Add a user'}</DialogTitle>
          <DialogDescription>{editing ? 'Leave the password blank to keep the current one.' : 'The account and its profile are created in one transaction.'}</DialogDescription>
        </DialogHeader>
        {!editing && (
          <Tabs value={role} onValueChange={(v) => { setRole(v as typeof role); setProfile(toFormValues(v as Role, null)); }}>
            <TabsList>{CREATABLE.map((r) => <TabsTrigger key={r} value={r}>{ROLE_LABEL[r]}</TabsTrigger>)}</TabsList>
          </Tabs>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Username *"><Input value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} /></Field>
          <Field label="Email *"><Input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></Field>
          <Field label={editing ? 'New password' : 'Temporary password *'} className="col-span-2 sm:col-span-1"><Input type="password" autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} /></Field>
        </div>
        <div className="border-t border-slate-100 pt-4"><ProfileFields role={role} values={profile} onChange={setProfile} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({ user, onClose, onSaved }: { user: AuthUser | null; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<Exclude<Role, 'admin'>>('doctor');
  const [profile, setProfile] = useState<ProfileValues>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    const next = CREATABLE.find((r) => r !== user.role)!;
    setRole(next);
    setProfile({ ...toFormValues(next, null), firstName: user.profile?.firstName ?? '', lastName: user.profile?.lastName ?? '' });
  }, [user]);
  if (!user) return null;
  const save = async () => {
    const missing = requiredMissing(role, profile);
    if (missing) { toast.error(`${missing} is required`); return; }
    setBusy(true);
    try { const r = await api.patch(`/admin/users/${user.id}/role`, { role, profile: toPayload(role, profile) }); toast.success(r.data.message); onSaved(); onClose(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change role for {user.displayName}</DialogTitle>
          <DialogDescription>Only accounts without clinical or stock activity can switch roles — otherwise deactivate and create a new account.</DialogDescription>
        </DialogHeader>
        <Tabs value={role} onValueChange={(v) => { setRole(v as typeof role); setProfile({ ...toFormValues(v as Role, null), firstName: profile.firstName, lastName: profile.lastName }); }}>
          <TabsList>{CREATABLE.filter((r) => r !== user.role).map((r) => <TabsTrigger key={r} value={r}>{ROLE_LABEL[r]}</TabsTrigger>)}</TabsList>
        </Tabs>
        <ProfileFields role={role} values={profile} onChange={setProfile} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? 'Switching…' : `Make ${ROLE_LABEL[role].toLowerCase()}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [rows, setRows] = useState<AuditLog[] | null>(null);
  useEffect(() => { if (open) { setRows(null); get<AuditLog[]>('/admin/audit-logs', { limit: 80 }).then(setRows).catch(() => setRows([])); } }, [open]);
  const tone = { INSERT: 'success', UPDATE: 'blue', DELETE: 'error' } as const;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Audit log</DialogTitle><DialogDescription>Written by the audit plugin (Oracle: audit triggers) on every insert, update and delete</DialogDescription></DialogHeader>
        {rows === null ? <TableSkeleton rows={5} /> : rows.length === 0 ? <EmptyState title="No audit entries" /> : (
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Collection</th><th className="px-4 py-2.5">Operation</th><th className="px-4 py-2.5">Record</th><th className="px-4 py-2.5">By</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatDate(r.createdAt, 'dd MMM yy, HH:mm')}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{r.collectionName ?? '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant={tone[r.action as keyof typeof tone] ?? 'gray'}>{r.action}</Badge></td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{r.recordId ? String(r.recordId).slice(-8) : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.user?.username ?? 'system'}</td>
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
