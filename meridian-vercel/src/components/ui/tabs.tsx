'use client';
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => <TabsPrimitive.Root className={cn('flex flex-col gap-5', className)} {...props} />;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('inline-flex w-fit flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1', className)} {...props} />;
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-transparent px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none',
        'data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs',
        className
      )}
      {...props}
    />
  );
}
const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />;
export { Tabs, TabsList, TabsTrigger, TabsContent };
