import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold [&>svg]:size-3',
  {
    variants: {
      variant: {
        gray: 'border-slate-200/60 bg-slate-100 text-slate-600',
        success: 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200/60 bg-amber-50 text-amber-700',
        error: 'border-rose-200/60 bg-rose-50 text-rose-700',
        blue: 'border-sky-200/60 bg-sky-50 text-sky-700',
        purple: 'border-purple-200/60 bg-purple-50 text-purple-700',
        brand: 'border-brand-100 bg-brand-50 text-brand-800',
        glass: 'border-white/30 bg-white/20 text-white',
      },
    },
    defaultVariants: { variant: 'gray' },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
