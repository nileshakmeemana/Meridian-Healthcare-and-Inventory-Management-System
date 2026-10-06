'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Lock01 } from '@untitledui/icons';
import { useAuth } from '@/store/auth';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';

/** Renders children only for the listed roles (the API enforces the same rule) */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const role = useAuth((s) => s.user?.role);
  if (role && roles.includes(role)) return <>{children}</>;
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-card">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-slate-200/60 bg-slate-100 text-slate-600"><Lock01 className="size-5" /></div>
      <h1 className="text-lg font-bold text-slate-900">This area isn&apos;t part of your role</h1>
      <p className="mt-1 text-sm text-slate-500">Your account doesn&apos;t have access to this page. Ask the administrator if you think that&apos;s a mistake.</p>
      <Button asChild className="mt-6"><Link href="/dashboard">Back to overview</Link></Button>
    </div>
  );
}
