import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 shadow-xs transition outline-none placeholder:text-slate-400',
        'focus-visible:border-brand-500 focus-visible:ring-[3px] focus-visible:ring-brand-500/15',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-500 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className
      )}
      {...props}
    />
  );
}
export { Input };
