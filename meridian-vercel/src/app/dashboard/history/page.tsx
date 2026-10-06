'use client';
import { useAuth } from '@/store/auth';
import { RoleGate } from '@/components/layout/role-gate';
import { PatientRecord } from '@/components/home/patient-record';

export default function HistoryPage() {
  const profileId = useAuth((s) => s.user?.profileId);
  return <RoleGate roles={['patient']}>{profileId && <PatientRecord id={profileId} self />}</RoleGate>;
}
