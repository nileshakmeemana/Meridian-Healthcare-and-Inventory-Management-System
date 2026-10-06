'use client';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'rounded-xl! border-slate-200! font-sans! shadow-lg!',
          title: 'font-semibold! text-slate-900!',
          description: 'text-slate-500!',
        },
      }}
      {...props}
    />
  );
}
