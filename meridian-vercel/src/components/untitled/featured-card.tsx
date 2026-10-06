'use client';
/**
 * Adapted from Untitled UI's sidebar "featured card" pattern — rendered as the
 * Cold Chain Monitor card from the dashboard HTML, with role-relevant content.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Icon } from '@/components/layout/nav-config';

interface FeaturedCardProps {
  title: string;
  emoji?: string;
  description: ReactNode;
  action: { label: string; href: string; icon?: Icon };
  secondary?: { label: string; href: string };
}

export function FeaturedCard({ title, emoji, description, action, secondary }: FeaturedCardProps) {
  const ActionIcon = action.icon;
  return (
    <div className="rounded-2xl border border-emerald-100/70 bg-[#f4f7f5] p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {emoji && <span className="text-sm" aria-hidden="true">{emoji}</span>}
      </div>
      <p className="mb-3.5 text-xs leading-relaxed text-slate-500">{description}</p>
      <div className="flex items-center gap-2">
        <Link href={action.href} className="flex items-center gap-1.5 rounded-xl bg-brand-800 px-3 py-2 whitespace-nowrap text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900">
          {ActionIcon && <ActionIcon className="size-3.5" />}
          <span>{action.label}</span>
        </Link>
        {secondary && (
          <Link href={secondary.href} className="px-2 py-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900">
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
