'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock01, User01 } from '@untitledui/icons';
import { api } from '@/lib/api';
import { apiError, formatDate, initials } from '@/lib/utils';
import type { AuthUser } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { ROLE_LABEL } from '@/components/layout/nav-config';
import { PageHeader } from '@/components/dashboard/page-header';
import { Field } from '@/components/forms/field';
import { ProfileFields, requiredMissing, toFormValues, toPayload, type ProfileValues } from '@/components/forms/profile-fields';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<ProfileValues>({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setProfile(toFormValues(user.role, user.profile));
    // Refresh from the server so the form never shows stale persisted data
    api.get('/auth/me').then((r) => { const u = r.data.data as AuthUser; setUser(u); setProfile(toFormValues(u.role, u.profile)); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const saveProfile = async () => {
    const missing = requiredMissing(user.role, profile, false);
    if (missing) { toast.error(`${missing} is required`); return; }
    setBusy('profile');
    try {
      const r = await api.put('/auth/profile', { email, profile: toPayload(user.role, profile, false) });
      setUser(r.data.data); toast.success(r.data.message);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(null); }
  };
  const savePassword = async () => {
    if (pw.newPassword !== pw.confirm) { toast.error('New passwords do not match'); return; }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw.newPassword)) { toast.error('Use 8+ characters with a letter and a number'); return; }
    setBusy('password');
    try {
      const r = await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success(r.data.message); setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Settings" description="Your profile and sign-in security" />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card lg:col-span-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-14"><AvatarFallback className="text-base">{initials(user.displayName)}</AvatarFallback></Avatar>
            <div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-900">{user.displayName}</h2><p className="truncate text-xs text-slate-500">@{user.username}</p></div>
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd><Badge variant="brand">{ROLE_LABEL[user.role]}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-emerald-700">Active</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Last sign-in</dt><dd className="font-semibold text-slate-700">{formatDate(user.lastLogin, 'dd MMM yyyy, HH:mm')}</dd></div>
            {user.profile?.licenseNumber && <div className="flex justify-between"><dt className="text-slate-500">Licence</dt><dd className="font-mono font-semibold text-slate-700">{user.profile.licenseNumber}</dd></div>}
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5"><User01 className="size-5 text-slate-500" /><div><h2 className="text-lg font-bold text-slate-900">Profile</h2><p className="text-xs text-slate-500">Licence numbers can only be changed by the administrator</p></div></div>
            <div className="space-y-4 p-5">
              <Field label="Sign-in email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <ProfileFields role={user.role} values={profile} onChange={setProfile} admin={false} />
              <div className="flex justify-end"><Button disabled={busy === 'profile'} onClick={saveProfile}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</Button></div>
            </div>
          </section>

          <section id="password" className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5"><Lock01 className="size-5 text-slate-500" /><div><h2 className="text-lg font-bold text-slate-900">Change password</h2><p className="text-xs text-slate-500">Passwords are hashed with bcrypt — nobody can read them</p></div></div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
              <Field label="New password"><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
              <Field label="Confirm new password"><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
              <div className="flex justify-end sm:col-span-3"><Button disabled={busy === 'password' || !pw.currentPassword} onClick={savePassword}>{busy === 'password' ? 'Updating…' : 'Update password'}</Button></div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
