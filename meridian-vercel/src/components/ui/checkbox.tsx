'use client';
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from '@untitledui/icons';
import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[5px] border border-slate-300 bg-white shadow-xs transition outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-brand-500/25 data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-700 data-[state=indeterminate]:border-brand-700 data-[state=indeterminate]:bg-brand-700 text-white',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === 'indeterminate' ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
export { Checkbox };
