import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNowStrict, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatLKR = (n = 0, opts: { compact?: boolean } = {}) =>
  `Rs. ${new Intl.NumberFormat('en-LK', opts.compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;

export const formatNumber = (n = 0, compact = false) =>
  new Intl.NumberFormat('en-US', compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}).format(n || 0);

export const formatDate = (d?: string | Date | null, pattern = 'dd MMM, yyyy') => {
  if (!d) return '—';
  const date = new Date(d);
  return isValid(date) ? format(date, pattern) : '—';
};

export const timeAgo = (d?: string | Date | null) => (d ? `${formatDistanceToNowStrict(new Date(d))} ago` : '—');

export const toISODate = (d: Date = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const initials = (name = '') =>
  name.replace(/^Dr\.\s*/, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'M';

export const personName = (p?: { firstName?: string; lastName?: string } | null, prefix = '') =>
  p ? `${prefix}${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '—';

export const shortId = (id?: string) => (id ? id.slice(-6).toUpperCase() : '—');

export function apiError(err: unknown, fallback = 'Something went wrong') {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}
