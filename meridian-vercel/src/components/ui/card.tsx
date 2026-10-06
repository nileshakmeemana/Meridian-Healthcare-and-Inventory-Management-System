import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-2xl border border-slate-200/80 bg-white text-card-foreground shadow-card', className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between', className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('text-lg font-bold tracking-tight text-slate-900', className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('mt-0.5 text-xs text-slate-500', className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-5', className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center border-t border-slate-100 px-5 py-4', className)} {...props} />;
}
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
