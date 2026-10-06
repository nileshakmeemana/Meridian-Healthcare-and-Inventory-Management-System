'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { BLOOD_GROUPS, GENDERS } from '@/lib/constants';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Field } from '@/components/forms/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', dateOfBirth: '', gender: '', bloodGroup: '', phone: '', address: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.password)) { toast.error('Password needs 8+ characters with a letter and a number'); return; }
    if (!f.gender) { toast.error('Select a gender'); return; }
    setBusy(true);
    try {
      await api.post('/auth/register', { ...f, bloodGroup: f.bloodGroup || undefined });
      toast.success('Account created — you can sign in now');
      router.push('/login');
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Create your patient account" subtitle="Book visits and see your prescriptions online.">
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <Field label="First name"><Input required value={f.firstName} onChange={(e) => set('firstName')(e.target.value)} /></Field>
        <Field label="Last name"><Input required value={f.lastName} onChange={(e) => set('lastName')(e.target.value)} /></Field>
        <Field label="Username"><Input required value={f.username} onChange={(e) => set('username')(e.target.value)} /></Field>
        <Field label="Email"><Input required type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} /></Field>
        <Field label="Password" className="col-span-2" hint="At least 8 characters, including a letter and a number">
          <Input required type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password')(e.target.value)} />
        </Field>
        <Field label="Date of birth"><Input required type="date" max={new Date().toISOString().slice(0, 10)} value={f.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} /></Field>
        <Field label="Gender">
          <Select value={f.gender} onValueChange={set('gender')}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
        </Field>
        <Field label="Blood group">
          <Select value={f.bloodGroup} onValueChange={set('bloodGroup')}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
        </Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="07X XXX XXXX" /></Field>
        <Field label="Address" className="col-span-2"><Input value={f.address} onChange={(e) => set('address')(e.target.value)} /></Field>
        <Button type="submit" size="lg" className="col-span-2" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already registered? <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-900">Sign in</Link></p>
    </AuthLayout>
  );
}
