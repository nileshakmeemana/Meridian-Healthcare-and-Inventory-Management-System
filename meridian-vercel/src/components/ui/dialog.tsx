'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XClose } from '@untitledui/icons';
import { cn } from '@/lib/utils';

const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => <DialogPrimitive.Root data-slot="dialog" {...props} />;
const DialogTrigger = (props: React.ComponentProps<typeof DialogPrimitive.Trigger>) => <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
const DialogClose = (props: React.ComponentProps<typeof DialogPrimitive.Close>) => <DialogPrimitive.Close data-slot="dialog-close" {...props} />;

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-transparent data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        style={{ backgroundColor: 'transparent', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none">
          <XClose className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
const DialogHeader = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />;
const DialogFooter = ({ className, ...props }: React.ComponentProps<'div'>) => <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => <DialogPrimitive.Title className={cn('text-lg font-bold tracking-tight text-slate-900', className)} {...props} />;
const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => <DialogPrimitive.Description className={cn('text-sm text-slate-500', className)} {...props} />;

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
