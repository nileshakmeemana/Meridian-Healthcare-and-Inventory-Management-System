import type { FC, SVGProps } from 'react';
import {
  LayoutGrid01, BarChart07, SwitchHorizontal01, Truck01, Calendar, Users01, UserSquare, Settings01,
  Bell01, ClipboardCheck, Package, Building07, ShieldTick, File06, HeartRounded, Inbox01, CalendarCheck01,
} from '@untitledui/icons';
import { Pill, Stethoscope } from '@/components/icons/pill';
import type { Role } from '@/lib/types';
import type { useCounts } from '@/store/counts';

export type Icon = FC<SVGProps<SVGSVGElement>>;
type CountState = ReturnType<typeof useCounts.getState>;

export interface NavBadge { label: string; tone: 'gray' | 'amber' | 'rose' | 'brand' }
export interface NavItem { label: string; href: string; icon: Icon; badge?: (c: CountState) => NavBadge | null; keywords?: string }
export interface NavSection { label: string; items: NavItem[] }

const num = (n: number, tone: NavBadge['tone'] = 'gray', suffix = ''): NavBadge | null => (n > 0 ? { label: `${n}${suffix}`, tone } : null);

const settings: NavSection = {
  label: 'Account',
  items: [
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell01, badge: (c) => num(c.unread, 'brand') },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings01, keywords: 'profile password' },
  ],
};

export const NAV: Record<Role, NavSection[]> = {
  admin: [
    { label: 'Main Menu', items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutGrid01 },
      { label: 'Supply Analytics', href: '/dashboard/reports', icon: BarChart07, keywords: 'reports bi mining forecast' },
      { label: 'Dispensation', href: '/dashboard/sales', icon: SwitchHorizontal01, keywords: 'sales' },
      { label: 'Purchase Orders', href: '/dashboard/supply-orders', icon: Truck01, keywords: 'supply delivery' },
    ] },
    { label: 'Inventory Modules', items: [
      { label: 'Pharmacy Stock', href: '/dashboard/medicines', icon: Pill, badge: (c) => num(c.lowStock, 'amber', ' Low'), keywords: 'medicines drugs sku' },
      { label: 'Requisitions', href: '/dashboard/requests', icon: Inbox01, badge: (c) => num(c.pendingRequests) },
      { label: 'Suppliers', href: '/dashboard/suppliers', icon: Building07 },
    ] },
    { label: 'Hospital Admin', items: [
      { label: 'Users & Roles', href: '/dashboard/users', icon: ShieldTick, keywords: 'accounts staff' },
      { label: 'Appointments', href: '/dashboard/appointments', icon: Calendar, badge: (c) => num(c.todayAppointments) },
      { label: 'Patients', href: '/dashboard/patients', icon: Users01 },
      { label: 'Doctors', href: '/dashboard/doctors', icon: Stethoscope },
    ] },
    settings,
  ],
  pharmacist: [
    { label: 'Main Menu', items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutGrid01 },
      { label: 'Supply Analytics', href: '/dashboard/reports', icon: BarChart07, keywords: 'reports bi forecast' },
      { label: 'Dispensation', href: '/dashboard/sales', icon: SwitchHorizontal01, keywords: 'sales issue' },
      { label: 'Purchase Orders', href: '/dashboard/supply-orders', icon: Truck01, keywords: 'supply delivery' },
    ] },
    { label: 'Inventory Modules', items: [
      { label: 'Pharmacy Stock', href: '/dashboard/medicines', icon: Pill, badge: (c) => num(c.lowStock, 'amber', ' Low'), keywords: 'medicines drugs sku batch' },
      { label: 'Requisitions', href: '/dashboard/requests', icon: Inbox01, badge: (c) => num(c.pendingRequests) },
      { label: 'Suppliers', href: '/dashboard/suppliers', icon: Building07 },
    ] },
    { label: 'Clinical', items: [
      { label: 'Prescriptions', href: '/dashboard/prescriptions', icon: File06 },
      { label: 'Patients', href: '/dashboard/patients', icon: Users01 },
    ] },
    settings,
  ],
  doctor: [
    { label: 'Main Menu', items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutGrid01 },
      { label: 'Appointments', href: '/dashboard/appointments', icon: Calendar, badge: (c) => num(c.todayAppointments, 'brand', ' today') },
      { label: 'My Patients', href: '/dashboard/patients', icon: Users01 },
      { label: 'Prescriptions', href: '/dashboard/prescriptions', icon: File06 },
    ] },
    { label: 'Inventory Modules', items: [
      { label: 'Medicine Catalogue', href: '/dashboard/medicines', icon: Pill, keywords: 'drugs stock' },
      { label: 'Requisitions', href: '/dashboard/requests', icon: Inbox01, badge: (c) => num(c.pendingRequests) },
      { label: 'Clinical Insights', href: '/dashboard/reports', icon: BarChart07, keywords: 'reports bi basket' },
    ] },
    settings,
  ],
  supplier: [
    { label: 'Main Menu', items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutGrid01 },
      { label: 'Restock Requests', href: '/dashboard/requests', icon: Inbox01, badge: (c) => num(c.openSupplierRequests, 'amber', ' open') },
      { label: 'Supply Orders', href: '/dashboard/supply-orders', icon: Truck01, badge: (c) => num(c.inTransit, 'gray', ' in transit') },
    ] },
    settings,
  ],
  patient: [
    { label: 'Main Menu', items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutGrid01 },
      { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarCheck01, badge: (c) => num(c.upcomingVisits, 'brand') },
      { label: 'Prescriptions', href: '/dashboard/prescriptions', icon: File06 },
      { label: 'Find a Doctor', href: '/dashboard/doctors', icon: Stethoscope },
      { label: 'Medical History', href: '/dashboard/history', icon: HeartRounded },
    ] },
    settings,
  ],
};

/** Header primary action per role (the "Intake" button in the HTML) */
export const PRIMARY_ACTION: Record<Role, { label: string; href: string }> = {
  admin: { label: 'Add user', href: '/dashboard/users?new=1' },
  pharmacist: { label: 'New sale', href: '/dashboard/sales?new=1' },
  doctor: { label: 'Request medicine', href: '/dashboard/requests?new=1' },
  supplier: { label: 'Dispatch supply', href: '/dashboard/supply-orders?new=1' },
  patient: { label: 'Book visit', href: '/dashboard/appointments?new=1' },
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator', doctor: 'Consultant', pharmacist: 'Pharmacist', supplier: 'Supplier', patient: 'Patient',
};

export const ROLE_SUBTITLE: Record<Role, string> = {
  admin: 'Hospital Admin', doctor: 'Clinical Workspace', pharmacist: 'Hospital Inventory', supplier: 'Supplier Portal', patient: 'Patient Portal',
};

export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview', '/dashboard/reports': 'Analytics & BI', '/dashboard/sales': 'Dispensation',
  '/dashboard/supply-orders': 'Purchase Orders', '/dashboard/medicines': 'Pharmacy & Inventory', '/dashboard/requests': 'Requisitions',
  '/dashboard/suppliers': 'Suppliers', '/dashboard/users': 'Users & Roles', '/dashboard/appointments': 'Appointments',
  '/dashboard/patients': 'Patients', '/dashboard/doctors': 'Doctors', '/dashboard/prescriptions': 'Prescriptions',
  '/dashboard/notifications': 'Notifications', '/dashboard/settings': 'Settings', '/dashboard/history': 'Medical History',
};

// Re-export icons used for page-level empty states
export { Package, ClipboardCheck, UserSquare };
