import * as React from 'react';
import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full border-collapse text-left text-xs', className)} {...props} />
    </div>
  );
}
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('border-b border-slate-100 bg-slate-50/70', className)} {...props} />;
}
function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('divide-y divide-slate-100 font-medium text-slate-700', className)} {...props} />;
}
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('transition hover:bg-slate-50/60 data-[state=selected]:bg-brand-50/40', className)} {...props} />;
}
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th data-slot="table-head" className={cn('px-4 py-3.5 font-semibold whitespace-nowrap text-slate-500 first:pl-6 last:pr-6', className)} {...props} />;
}
function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('px-4 py-4 align-middle whitespace-nowrap first:pl-6 last:pr-6', className)} {...props} />;
}
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
