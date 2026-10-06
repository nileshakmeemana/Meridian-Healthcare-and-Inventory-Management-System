'use client';
import type { Role } from '@/lib/types';
import { BLOOD_GROUPS, GENDERS, SHIFTS, WEEKDAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from './field';

export type ProfileValues = Record<string, any>;

type Kind = 'text' | 'number' | 'date' | 'select' | 'days' | 'textarea';
interface Def { key: string; label: string; kind?: Kind; options?: string[]; required?: boolean; wide?: boolean; admin?: boolean }

const DEFS: Record<Exclude<Role, 'admin'>, Def[]> = {
  doctor: [
    { key: 'firstName', label: 'First name', required: true }, { key: 'lastName', label: 'Last name', required: true },
    { key: 'specialization', label: 'Specialization', required: true }, { key: 'licenseNumber', label: 'SLMC licence no.', required: true, admin: true },
    { key: 'phone', label: 'Phone' }, { key: 'room', label: 'Consulting room' },
    { key: 'experienceYears', label: 'Experience (years)', kind: 'number' }, { key: 'consultationFee', label: 'Consultation fee (Rs.)', kind: 'number' },
    { key: 'availableDays', label: 'Consulting days', kind: 'days', wide: true }, { key: 'bio', label: 'Short bio', kind: 'textarea', wide: true },
  ],
  pharmacist: [
    { key: 'firstName', label: 'First name', required: true }, { key: 'lastName', label: 'Last name', required: true },
    { key: 'licenseNumber', label: 'Pharmacy licence no.', required: true, admin: true }, { key: 'phone', label: 'Phone' },
    { key: 'shift', label: 'Shift', kind: 'select', options: SHIFTS },
  ],
  supplier: [
    { key: 'companyName', label: 'Company name', required: true, wide: true }, { key: 'contactPerson', label: 'Contact person' },
    { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Company email' }, { key: 'licenseNumber', label: 'NMRA licence no.', admin: true },
    { key: 'rating', label: 'Rating (0–5)', kind: 'number', admin: true }, { key: 'address', label: 'Address', wide: true },
  ],
  patient: [
    { key: 'firstName', label: 'First name', required: true }, { key: 'lastName', label: 'Last name', required: true },
    { key: 'dateOfBirth', label: 'Date of birth', kind: 'date', required: true }, { key: 'gender', label: 'Gender', kind: 'select', options: GENDERS, required: true },
    { key: 'bloodGroup', label: 'Blood group', kind: 'select', options: BLOOD_GROUPS }, { key: 'phone', label: 'Phone' },
    { key: 'emergencyContact', label: 'Emergency contact' }, { key: 'emergencyPhone', label: 'Emergency phone' },
    { key: 'address', label: 'Address', wide: true }, { key: 'allergies', label: 'Allergies', kind: 'textarea', wide: true },
  ],
};

export function requiredMissing(role: Role, values: ProfileValues, admin = true) {
  if (role === 'admin') return null;
  const miss = DEFS[role].find((d) => d.required && (admin || !d.admin) && !String(values[d.key] ?? '').trim());
  return miss?.label ?? null;
}

/** Normalises a stored profile (dates, arrays) into form values */
export function toFormValues(role: Role, profile: ProfileValues | null | undefined): ProfileValues {
  if (role === 'admin' || !profile) return role === 'doctor' ? { availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] } : {};
  const out: ProfileValues = {};
  DEFS[role].forEach((d) => {
    const v = profile[d.key];
    out[d.key] = d.kind === 'date' && v ? String(v).slice(0, 10) : v ?? (d.kind === 'days' ? [] : '');
  });
  return out;
}

export function toPayload(role: Role, values: ProfileValues, admin = true) {
  if (role === 'admin') return {};
  const out: ProfileValues = {};
  DEFS[role].filter((d) => admin || !d.admin).forEach((d) => {
    const v = values[d.key];
    if (v === '' || v === undefined) { if (d.kind === 'select' && d.key === 'bloodGroup') out[d.key] = null; return; }
    out[d.key] = d.kind === 'number' ? Number(v) : v;
  });
  return out;
}

export function ProfileFields({ role, values, onChange, admin = true }: { role: Role; values: ProfileValues; onChange: (v: ProfileValues) => void; admin?: boolean }) {
  if (role === 'admin') return null;
  const set = (k: string, v: unknown) => onChange({ ...values, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-4">
      {DEFS[role].filter((d) => admin || !d.admin).map((d) => {
        const v = values[d.key] ?? '';
        const label = `${d.label}${d.required ? ' *' : ''}`;
        let input: React.ReactNode;
        if (d.kind === 'select') {
          input = (
            <Select value={String(v)} onValueChange={(x) => set(d.key, x)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{d.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
          );
        } else if (d.kind === 'days') {
          const days: string[] = Array.isArray(v) ? v : [];
          input = (
            <div className="flex gap-1.5">
              {WEEKDAYS.map((w) => (
                <button key={w} type="button" onClick={() => set(d.key, days.includes(w) ? days.filter((x) => x !== w) : WEEKDAYS.filter((x) => days.includes(x) || x === w))}
                  className={cn('flex-1 rounded-lg border py-1.5 text-xs font-semibold transition', days.includes(w) ? 'border-brand-800 bg-brand-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-500')}>{w}</button>
              ))}
            </div>
          );
        } else if (d.kind === 'textarea') {
          input = <Textarea rows={2} value={String(v)} onChange={(e) => set(d.key, e.target.value)} />;
        } else {
          input = <Input type={d.kind ?? 'text'} value={String(v)} onChange={(e) => set(d.key, e.target.value)} max={d.kind === 'date' ? new Date().toISOString().slice(0, 10) : undefined} step={d.key === 'rating' ? '0.1' : undefined} />;
        }
        return <Field key={d.key} label={label} className={d.wide ? 'col-span-2' : ''}>{input}</Field>;
      })}
    </div>
  );
}
