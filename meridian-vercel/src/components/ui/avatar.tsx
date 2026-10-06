'use client';
import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200', className)} {...props} />
);
const AvatarImage = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image className={cn('aspect-square size-full object-cover', className)} {...props} />
);
const AvatarFallback = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback className={cn('flex size-full items-center justify-center bg-brand-50 text-[11px] font-bold text-brand-800', className)} {...props} />
);
export { Avatar, AvatarImage, AvatarFallback };
