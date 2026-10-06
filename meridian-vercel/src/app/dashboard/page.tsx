'use client';
import { useAuth } from '@/store/auth';
import { InventoryHome } from '@/components/home/inventory-home';
import { DoctorHome } from '@/components/home/doctor-home';
import { PatientHome } from '@/components/home/patient-home';
import { SupplierHome } from '@/components/home/supplier-home';

export default function DashboardHome() {
  const role = useAuth((s) => s.user?.role);
  if (role === 'doctor') return <DoctorHome />;
  if (role === 'patient') return <PatientHome />;
  if (role === 'supplier') return <SupplierHome />;
  return <InventoryHome />;
}
