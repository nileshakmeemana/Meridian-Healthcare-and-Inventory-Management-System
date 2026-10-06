'use client';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle } from '@untitledui/icons';
import { MeridianLogo } from '@/components/untitled/sidebar-navigation';

const POINTS = [
  'Role-scoped dashboards for admins, doctors, pharmacists, suppliers and patients',
  'Live stock levels with low-stock and expiry alerts raised by database triggers',
  'Demand forecasting, market-basket mining and ABC analysis on real sales',
];

/** Split-screen auth layout: form on the left, the green balance-card panel on the right */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto w-full max-w-md">
          <MeridianLogo />
          <h1 className="mt-10 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
      <div className="relative hidden p-4 lg:block">
        <div className="balance-card-bg flex h-full flex-col justify-end overflow-hidden rounded-3xl p-12 text-white shadow-card">
          <div className="relative z-10 max-w-md">
            <span className="inline-flex rounded-md border border-white/30 bg-brand-700 px-3 py-1 text-xs font-semibold">Meridian Central Hospital</span>
            <h2 className="mt-5 text-3xl leading-tight font-extrabold tracking-tight">Clinical care and pharmacy stock, finally in one place.</h2>
            <ul className="mt-8 space-y-3">
              {POINTS.map((p) => (
                <li key={p} className="flex gap-3 text-sm text-emerald-50/90"><CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-300" />{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
