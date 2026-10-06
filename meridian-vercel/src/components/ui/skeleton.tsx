import { cn } from '@/lib/utils';
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-lg bg-slate-100', className)} {...props} />;
}
