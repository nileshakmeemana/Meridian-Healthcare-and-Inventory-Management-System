import type { ReactNode } from 'react';
import { AlertCircle, SearchLg } from '@untitledui/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Icon } from '@/components/layout/nav-config';

export function EmptyState({ icon: IconCmp = SearchLg, title, description, action }: { icon?: Icon; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-slate-200/60 bg-slate-50 text-slate-500"><IconCmp className="size-5" /></div>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-rose-200/60 bg-rose-50 text-rose-600"><AlertCircle className="size-5" /></div>
      <p className="text-sm font-bold text-slate-900">Couldn&apos;t load this</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
    </div>
  );
}
