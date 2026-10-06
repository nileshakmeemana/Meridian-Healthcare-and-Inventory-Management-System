'use client';
import { use } from 'react';
import { RoleGate } from '@/components/layout/role-gate';
import { PatientRecord } from '@/components/home/patient-record';

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RoleGate roles={['admin', 'doctor', 'pharmacist']}><PatientRecord id={id} /></RoleGate>;
}
