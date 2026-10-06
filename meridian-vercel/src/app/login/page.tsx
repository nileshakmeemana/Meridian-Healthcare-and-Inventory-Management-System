'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn01 } from '@untitledui/icons';
import { api } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import type { AuthUser } from '@/lib/types';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Field } from '@/components/forms/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DEMO = [
  { role: 'Admin', email: 'admin@meridian.health' },
  { role: 'Doctor', email: 'silva@meridian.health' },
  { role: 'Pharmacist', email: 'nimal@meridian.health' },
  { role: 'Supplier', email: 'mediline@supplier.com' },
  { role: 'Patient', email: 'kasun@email.com' },
];
const DEMO_PASSWORD = 'Password@123';

export default function LoginPage() {
  const router = useRouter();
  const { token, hydrated, setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('expired')) toast.info('Your session ended. Please sign in again.');
  }, []);
  useEffect(() => { if (hydrated && token) router.replace('/dashboard'); }, [hydrated, token, router]);

  const signIn = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    const body = creds ?? { email, password };
    if (!body.email || !body.password) { toast.error('Enter your email and password'); return; }
    setBusy(true);
    try {
      const res = await api.post('/auth/login', body);
      const { token: t, user } = res.data.data as { token: string; user: AuthUser };
      setAuth(t, user);
      toast.success(`Welcome back, ${user.displayName}`);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(apiError(err, 'Sign-in failed. Is the API running on port 5000?'));
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Sign in to Meridian" subtitle="Use your hospital email or username.">
      <form onSubmit={signIn} className="space-y-4">
        <Field label="Email or username" htmlFor="email">
          <Input id="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@meridian.health" className="h-10" />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10 pr-10" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy}><LogIn01 /> {busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">New patient? <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-900">Create an account</Link></p>

      <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Demo accounts · password <span className="font-mono normal-case">{DEMO_PASSWORD}</span></p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <Button key={d.role} type="button" variant="secondary" size="sm" disabled={busy}
              onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); signIn(undefined, { email: d.email, password: DEMO_PASSWORD }); }}>
              {d.role}
            </Button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
