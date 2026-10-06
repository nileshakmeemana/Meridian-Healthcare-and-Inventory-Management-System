import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-slate-400',
        'focus-visible:border-brand-500 focus-visible:ring-[3px] focus-visible:ring-brand-500/15 disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
export { Textarea };
