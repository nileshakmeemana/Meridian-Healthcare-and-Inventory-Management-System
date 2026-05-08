'use client';
// src/app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Calendar, Pill, AlertTriangle,
  CheckCircle, Clock, Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { reportAPI } from '@/lib/api';
import { appointmentAPI, medicineAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const COLORS = ['#1d9a88','#2563eb','#d97706','#dc2626','#7c3aed'];

interface StatCard {
  label:    string;
  value:    string | number;
  icon:     React.ElementType;
  accent:   string;
  accentBg: string;
  trend?:   { value: number; up: boolean };
}

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const user  = useAuthStore((s) => s.user);
  const [stats, setStats]       = useState<any>(null);
  const [topMeds, setTopMeds]   = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const parseMedicineReportRow = (med: any) => ({
    MEDICINE_NAME: med.medicine_name ?? med.MEDICINE_NAME ?? med.name ?? med.NAME ?? 'Unknown',
    TOTAL_UNITS_SOLD: Number(med.total_prescribed ?? med.TOTAL_PRESCRIBED ?? 0),
    CATEGORY: med.category ?? med.CATEGORY ?? 'N/A',
    UNIQUE_PATIENTS: Number(med.unique_patients ?? med.UNIQUE_PATIENTS ?? 0),
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, medsRes, apptRes, medicineRes] = await Promise.all([
          reportAPI.dashboard(),
          reportAPI.mostUsedMedicines({ topN: 5 }),
          appointmentAPI.getAll(),
          medicineAPI.getAll({ limit: 200 }),
        ]);
        const dashboard = statsRes.data.data || {};
        setStats({
          TOTAL_ACTIVE_PATIENTS: dashboard.totalPatients || 0,
          TOTAL_ACTIVE_DOCTORS: dashboard.totalDoctors || 0,
          TOTAL_MEDICINES: dashboard.totalMedicines || 0,
          TODAY_APPOINTMENTS: dashboard.todayAppointments || 0,
          LOW_STOCK_COUNT: dashboard.lowStockCount || 0,
        });
        setTopMeds((medsRes.data.data || []).map(parseMedicineReportRow));
        setAppointments(apptRes.data.data || []);
        setMedicines(medicineRes.data.data || []);
      } catch {
        setStats(null);
        setTopMeds([]);
        setAppointments([]);
        setMedicines([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const isToday = (value: string) => String(value || '').slice(0, 10) === todayKey;
  const todayAppointments = appointments.filter((appt) => isToday(appt.APPOINTMENT_DATE));
  const completedToday = todayAppointments.filter((appt) => appt.STATUS === 'Completed').length;
  const pendingToday = todayAppointments.filter((appt) => appt.STATUS === 'Scheduled').length;
  const activeMedicines = medicines.filter((med) => Number(med.STOCK_QUANTITY || 0) > 0).length;
  const usedTopMeds = topMeds.filter((med) => Number(med.TOTAL_UNITS_SOLD || 0) > 0);

  const statCards: StatCard[] = stats ? [
    { label: 'Total Patients',  value: stats.TOTAL_ACTIVE_PATIENTS, icon: Users,     accent: 'text-blue-600', accentBg: 'bg-blue-50', trend: { value: 12, up: true } },
    { label: 'Appointments Today', value: stats.TODAY_APPOINTMENTS, icon: Calendar,  accent: 'text-teal-600', accentBg: 'bg-teal-50', trend: { value: 5,  up: true } },
    { label: 'Low Stock Items', value: stats.LOW_STOCK_COUNT,       icon: AlertTriangle, accent: 'text-amber-600', accentBg: 'bg-amber-50' },
    { label: 'Active Medicines', value: activeMedicines, icon: Pill, accent: 'text-teal-600', accentBg: 'bg-teal-50', trend: { value: 8, up: true } },
  ] : [];

  const roleGreeting: Record<string, string> = {
    admin:      'System Overview',
    doctor:     "Today's Schedule",
    pharmacist: 'Inventory Dashboard',
    supplier:   'Supply Dashboard',
    patient:    'My Health Dashboard',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-10 h-10 text-meridian-500 animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">
          {roleGreeting[user?.role || 'admin']}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Welcome back, {user?.firstName || user?.username}. Here's what's happening today.
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={idx} variants={item}>
              <div className="h-full min-h-[168px] rounded-2xl p-5 bg-white border border-border shadow-sm relative overflow-hidden flex flex-col">
                <div className="relative flex flex-1 flex-col">
                  <div className={`w-10 h-10 ${card.accentBg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${card.accent}`} />
                  </div>
                  <p className="text-slate-500 text-sm">{card.label}</p>
                  <p className="text-3xl font-bold mt-0.5 text-slate-900">{card.value}</p>
                  <div className="mt-auto min-h-5 flex items-center gap-1">
                    {card.trend ? (
                      <>
                        {card.trend.up
                          ? <ArrowUpRight className="w-3 h-3" />
                          : <ArrowDownRight className="w-3 h-3" />}
                        <span className="text-xs text-slate-500">{card.trend.value}% vs yesterday</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top medicines chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Top Medicines Overview</h3>
              <p className="text-xs text-muted-foreground">Top medicines by prescriptions</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={usedTopMeds} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="MEDICINE_NAME" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => [v.toLocaleString(), 'Units']} />
              <Bar dataKey="TOTAL_UNITS_SOLD" fill="#1d9a88" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {usedTopMeds.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">No medicine usage data available for the selected period.</p>
          )}
        </motion.div>

        {/* Today's status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="font-semibold text-foreground mb-4">Today's Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Completed', value: completedToday, icon: CheckCircle, color: 'text-emerald-500' },
              { label: 'Pending',   value: pendingToday, icon: Clock, color: 'text-amber-500' },
              { label: 'Active Doctors',  value: stats?.TOTAL_ACTIVE_DOCTORS || 0, icon: Users, color: 'text-blue-500' },
              { label: 'Medicines in Stock', value: activeMedicines, icon: Pill, color: 'text-meridian-500' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                </div>
                <span className="font-semibold text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Most Used Medicines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Most Used Medicines</h3>
            <p className="text-xs text-muted-foreground">Top 5 by units dispensed — Business Intelligence Report</p>
          </div>
          <span className="text-xs bg-meridian-100 text-meridian-700 px-2 py-1 rounded-full font-medium">
            BI Report
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={usedTopMeds} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="MEDICINE_NAME" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip />
              <Bar dataKey="TOTAL_UNITS_SOLD" fill="#1d9a88" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {usedTopMeds.map((med, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{med.MEDICINE_NAME}</p>
                  <p className="text-xs text-muted-foreground">{med.CATEGORY}</p>
                </div>
                <span className="text-sm font-semibold text-foreground flex-shrink-0">
                  {med.TOTAL_UNITS_SOLD} units
                </span>
              </div>
            ))}
            {usedTopMeds.length === 0 && (
              <p className="text-xs text-muted-foreground">No usage records found yet.</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
