'use client';
// src/components/layout/Sidebar.tsx
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, Pill, Truck, FileText,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight, Activity,
  BarChart3, ClipboardList, ShoppingBag, UserCheck, Stethoscope,
  Package, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label:    string;
  href:     string;
  icon:     React.ElementType;
  roles:    string[];
  badge?:   number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',              icon: LayoutDashboard, roles: ['admin','doctor','pharmacist','supplier','patient'] },
  { label: 'Patients',      href: '/dashboard/patients',     icon: Users,           roles: ['admin','doctor'] },
  { label: 'Doctors',       href: '/dashboard/doctors',      icon: Stethoscope,     roles: ['admin'] },
  { label: 'Pharmacists',   href: '/dashboard/pharmacists',  icon: Pill,            roles: ['admin'] },
  { label: 'Appointments',  href: '/dashboard/appointments', icon: Calendar,        roles: ['admin','doctor','patient'] },
  { label: 'Prescriptions', href: '/dashboard/prescriptions',icon: FileText,        roles: ['admin','doctor','pharmacist','patient'] },
  { label: 'Medicines',     href: '/dashboard/medicines',    icon: Pill,            roles: ['admin','pharmacist','doctor','supplier'] },
  { label: 'Suppliers',     href: '/dashboard/supplier',     icon: Truck,           roles: ['admin','pharmacist','supplier'] },
  { label: 'Reports',       href: '/dashboard/reports',      icon: BarChart3,       roles: ['admin','pharmacist'] },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const filtered = navItems.filter(i => i.roles.includes(user?.role || ''));

  const roleColor: Record<string, string> = {
    admin:       'bg-violet-500',
    doctor:      'bg-blue-500',
    pharmacist:  'bg-emerald-500',
    supplier:    'bg-amber-500',
    patient:     'bg-rose-500',
  };
  const roleLabel: Record<string, string> = {
    admin:       'Administrator',
    doctor:      'Doctor',
    pharmacist:  'Pharmacist',
    supplier:    'Supplier',
    patient:     'Patient',
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="meridian-sidebar relative flex flex-col h-screen flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-meridian-400 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-white font-bold text-lg tracking-tight">Meridian</span>
              <p className="text-xs text-white/40 -mt-0.5">Healthcare System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => {
          const Icon    = item.icon;
          const active  = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  'nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                  active && 'active'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium truncate flex-1"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && !collapsed && (
                  <span className="ml-auto bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', roleColor[user?.role || 'admin'])}>
            {(user?.firstName?.[0] || user?.username?.[0] || 'M').toUpperCase()}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-white text-sm font-medium truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.username}
                </p>
                <p className="text-white/40 text-xs">{roleLabel[user?.role || '']}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={logout}
          className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-rose-400 hover:text-rose-300"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
