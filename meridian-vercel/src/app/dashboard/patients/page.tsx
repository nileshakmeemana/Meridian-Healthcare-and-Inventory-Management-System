'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Users01, ChevronRight } from '@untitledui/icons';
import { get } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/hooks';
import { formatDate, personName, initials } from '@/lib/utils';
import type { Patient } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/dashboard/states';
import { StatusDot } from '@/components/dashboard/status-dot';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function PatientsPage() {
  return <RoleGate roles={['admin', 'doctor', 'pharmacist']}><Patients /></RoleGate>;
}

function Patients() {
  const role = useAuth((s) => s.user!.role);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi(() => get<Patient[]>('/patients', { search: q || undefined }), [q]);

  return (
    <>
      <PageHeader title={role === 'doctor' ? 'My Patients' : 'Patients'}
        description={role === 'doctor' ? 'Patients you have seen or are booked to see' : 'Registered patients and their visit activity'} />
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold tracking-tight text-slate-900">{data ? `${data.length} patients` : 'Patients'}</h2><p className="mt-0.5 text-xs text-slate-500">Select a row to open the full record</p></div>
          <SearchInput value={search} onChange={setSearch} placeholder="Name or phone…" />
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton rows={8} /> : !data?.length ? <EmptyState icon={Users01} title="No patients found" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Age / gender</TableHead><TableHead>Blood</TableHead><TableHead>Phone</TableHead><TableHead>Allergies</TableHead><TableHead>Last visit</TableHead><TableHead>Account</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p._id} className="cursor-pointer" onClick={() => router.push(`/dashboard/patients/${p._id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8"><AvatarFallback>{initials(personName(p))}</AvatarFallback></Avatar>
                      <div><p className="font-bold text-slate-900">{personName(p)}</p><p className="text-[10px] text-slate-400">{p.user?.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.age ?? '—'} · {p.gender}</TableCell>
                  <TableCell>{p.bloodGroup ? <Badge variant="error">{p.bloodGroup}</Badge> : '—'}</TableCell>
                  <TableCell className="text-slate-600">{p.phone ?? '—'}</TableCell>
                  <TableCell className="max-w-40 truncate text-slate-600">{p.allergies || '—'}</TableCell>
                  <TableCell className="text-slate-600"><p>{formatDate(p.lastVisit)}</p><p className="text-[10px] text-slate-400">{p.visits ?? 0} visits</p></TableCell>
                  <TableCell><StatusDot tone={p.user?.isActive === false ? 'rose' : 'emerald'}>{p.user?.isActive === false ? 'Inactive' : 'Active'}</StatusDot></TableCell>
                  <TableCell className="w-8 text-slate-400"><ChevronRight className="size-4" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
