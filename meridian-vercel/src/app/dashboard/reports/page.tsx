'use client';
import { useState } from 'react';
import { useAuth } from '@/store/auth';
import type { Role } from '@/lib/types';
import { RoleGate } from '@/components/layout/role-gate';
import { PageHeader } from '@/components/dashboard/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenuePanel, AppointmentsPanel, MostUsedPanel, ForecastPanel, BasketPanel, AbcPanel, SuppliersPanel } from '@/components/reports/panels';

const TABS: { value: string; label: string; roles: Role[]; render: () => React.ReactNode }[] = [
  { value: 'most-used', label: 'Most used', roles: ['admin', 'pharmacist', 'doctor'], render: () => <MostUsedPanel /> },
  { value: 'revenue', label: 'Revenue', roles: ['admin', 'pharmacist'], render: () => <RevenuePanel /> },
  { value: 'forecast', label: 'Demand forecast', roles: ['admin', 'pharmacist'], render: () => <ForecastPanel /> },
  { value: 'basket', label: 'Market basket', roles: ['admin', 'pharmacist', 'doctor'], render: () => <BasketPanel /> },
  { value: 'abc', label: 'ABC analysis', roles: ['admin', 'pharmacist'], render: () => <AbcPanel /> },
  { value: 'appointments', label: 'Appointments', roles: ['admin', 'doctor'], render: () => <AppointmentsPanel /> },
  { value: 'suppliers', label: 'Suppliers', roles: ['admin', 'pharmacist'], render: () => <SuppliersPanel /> },
];

export default function ReportsPage() {
  return <RoleGate roles={['admin', 'pharmacist', 'doctor']}><Reports /></RoleGate>;
}

function Reports() {
  const role = useAuth((s) => s.user!.role);
  const tabs = TABS.filter((t) => t.roles.includes(role));
  const [tab, setTab] = useState(tabs[0].value);
  return (
    <>
      <PageHeader title={role === 'doctor' ? 'Clinical Insights' : 'Analytics & Business Intelligence'}
        description="Reports built on database views and stored procedures, plus three data-mining algorithms" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white">{tabs.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
        {tabs.map((t) => <TabsContent key={t.value} value={t.value}>{tab === t.value && t.render()}</TabsContent>)}
      </Tabs>
    </>
  );
}
