'use client';
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

const DropdownMenu = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
const DropdownMenuTrigger = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) => <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn('z-50 min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
function DropdownMenuItem({ className, variant, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: 'destructive' }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium outline-none select-none focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-slate-400",
        variant === 'destructive' && 'text-rose-600 focus:bg-rose-50 focus:text-rose-700 [&_svg]:text-rose-500',
        className
      )}
      {...props}
    />
  );
}
const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) => (
  <DropdownMenuPrimitive.Label className={cn('px-2.5 py-2 text-xs font-semibold text-slate-500', className)} {...props} />
);
const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => (
  <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-slate-100', className)} {...props} />
);
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
