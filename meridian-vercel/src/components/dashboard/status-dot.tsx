import { cn } from '@/lib/utils';

const DOT = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', slate: 'bg-slate-400', blue: 'bg-sky-500', purple: 'bg-purple-500' };
export type DotTone = keyof typeof DOT;

/** "● In Stock" style status from the activity table */
export function StatusDot({ tone, children, className }: { tone: DotTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-slate-800', className)}>
      <span className={cn('size-1.5 rounded-full', DOT[tone])} />
      {children}
    </span>
  );
}

export const STOCK_TONE: Record<string, DotTone> = { Normal: 'emerald', Low: 'amber', Critical: 'rose', Expired: 'rose' };
export const STOCK_LABEL: Record<string, string> = { Normal: 'In Stock', Low: 'Reorder Level', Critical: 'Critical', Expired: 'Expired' };

export const STATUS_TONE: Record<string, DotTone> = {
  Scheduled: 'blue', Completed: 'emerald', Cancelled: 'rose', 'No-Show': 'slate',
  Active: 'emerald', Fulfilled: 'slate', Expired: 'rose',
  Pending: 'amber', Approved: 'blue', Rejected: 'rose',
  Shipped: 'blue', Delivered: 'emerald',
};
