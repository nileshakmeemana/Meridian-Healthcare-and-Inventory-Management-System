import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/40",
  {
    variants: {
      variant: {
        default: 'bg-brand-800 text-white shadow-xs hover:bg-brand-900',
        ink: 'bg-ink text-white shadow-xs hover:bg-black',
        destructive: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700',
        outline: 'border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900',
        secondary: 'bg-[#f4f6f8] text-slate-700 hover:bg-slate-200/70',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        link: 'text-brand-800 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-xl px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

function Button({ className, variant, size, asChild = false, ...props }:
  React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
