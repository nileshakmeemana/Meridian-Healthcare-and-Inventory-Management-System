'use client';
// src/app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Calendar, Pill, AlertTriangle,
  CheckCircle, Clock, Activity, ArrowUpRight, ArrowDownRight, FileText, Truck
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { reportAPI } from '@/lib/api';
import { appointmentAPI, medicineAPI, patientAPI, prescriptionAPI, supplierAPI } from '@/lib/api';
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
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [supplyOrders, setSupplyOrders] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [supplierPerf, setSupplierPerf] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  const parseMedicineReportRow = (med: any) => ({
    MEDICINE_NAME: med.medicine_name ?? med.MEDICINE_NAME ?? med.name ?? med.NAME ?? 'Unknown',
    TOTAL_UNITS_SOLD: Number(med.total_prescribed ?? med.TOTAL_PRESCRIBED ?? 0),
    CATEGORY: med.category ?? med.CATEGORY ?? 'N/A',
    UNIQUE_PATIENTS: Number(med.unique_patients ?? med.UNIQUE_PATIENTS ?? 0),
  });

  const getValue = (row: any, upper: string, lower: string) => row?.[upper] ?? row?.[lower];
  const dateKey = (value: any) => {
    const text = String(value || '');
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text.slice(0, 10) : parsed.toLocaleDateString('en-CA');
  };
  const monthKey = (value: any) => {
    const text = String(value || '');
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        if (user.role === 'patient') {
          const profileRes = await patientAPI.getMe();
          const patient = profileRes.data?.data || null;
          const patientId = getValue(patient, 'PATIENT_ID', 'patient_id');
          const historyRes = patientId ? await patientAPI.getMedicalHistory(patientId) : null;
          const history = historyRes?.data?.data || {};

          setPatientProfile(patient);
          setStats(null);
          setTopMeds([]);
          setAppointments(history.appointments || []);
          setPrescriptions(history.prescriptions || []);
          setSupplyOrders([]);
          setMedicines([]);
          return;
        }

        const [statsRes, medsRes, apptRes, medicineRes, presRes, ordersRes, supplierPerfRes] = await Promise.allSettled([
          reportAPI.dashboard(),
          reportAPI.mostUsedMedicines({ topN: 5 }),
          appointmentAPI.getAll(),
          medicineAPI.getAll({ limit: 200 }),
          prescriptionAPI.getAll(),
          supplierAPI.getOrders(),
          reportAPI.supplierPerformance(),
        ]);
        const dashboard =
          statsRes.status === 'fulfilled' ? statsRes.value.data?.data || {} : {};
        setStats({
          TOTAL_ACTIVE_PATIENTS: dashboard.totalPatients || 0,
          TOTAL_ACTIVE_DOCTORS: dashboard.totalDoctors || 0,
          TOTAL_MEDICINES: dashboard.totalMedicines || 0,
          TODAY_APPOINTMENTS: dashboard.todayAppointments || 0,
          LOW_STOCK_COUNT: dashboard.lowStockCount || 0,
        });
        setTopMeds(
          medsRes.status === 'fulfilled'
            ? (medsRes.value.data?.data || []).map(parseMedicineReportRow)
            : []
        );
        setAppointments(
          apptRes.status === 'fulfilled' ? apptRes.value.data?.data || [] : []
        );
        setMedicines(
          medicineRes.status === 'fulfilled' ? medicineRes.value.data?.data || [] : []
        );
        setPrescriptions(
          presRes.status === 'fulfilled' ? presRes.value.data?.data || [] : []
        );
        setSupplyOrders(
          ordersRes.status === 'fulfilled' ? ordersRes.value.data?.data || [] : []
        );
        setSupplierPerf(
          supplierPerfRes && supplierPerfRes.status === 'fulfilled' ? (supplierPerfRes.value.data?.data || {}) : null
        );
      } catch {
        setStats(null);
        setTopMeds([]);
        setAppointments([]);
        setMedicines([]);
        setPrescriptions([]);
        setSupplyOrders([]);
        setPatientProfile(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.role, user?.userId]);

  const todayKey = new Date().toLocaleDateString('en-CA');
  const isToday = (value: string) => dateKey(value) === todayKey;
  const todayAppointments = appointments.filter((appt) => isToday(appt.APPOINTMENT_DATE));
  const completedToday = todayAppointments.filter((appt) => appt.STATUS === 'Completed').length;
  const pendingToday = todayAppointments.filter((appt) => appt.STATUS === 'Scheduled').length;
  const activeMedicines = medicines.filter((med) => Number(med.STOCK_QUANTITY || 0) > 0).length;
  const usedTopMeds = topMeds.filter((med) => Number(med.TOTAL_UNITS_SOLD || 0) > 0);

  // For pharmacists, replace first two stat cards with prescriptions to complete and orders to receive
  const prescriptionsToComplete = prescriptions.filter((p) => (p.STATUS || p.status || '').toLowerCase() !== 'completed').length;
  const ordersToReceive = supplyOrders.filter((o) => (o.STATUS || o.status || '').toLowerCase() !== 'delivered').length;
  const ordersToday = supplyOrders.filter((o) => isToday(getValue(o, 'ORDER_DATE', 'order_date'))).length;
  const statCards: StatCard[] = stats ? (
    user?.role === 'pharmacist' ? [
      { label: 'Prescriptions to Complete', value: prescriptionsToComplete, icon: FileText, accent: 'text-blue-600', accentBg: 'bg-blue-50' },
      { label: 'Orders to Receive', value: ordersToReceive, icon: Truck, accent: 'text-teal-600', accentBg: 'bg-teal-50' },
      { label: 'Low Stock Items', value: stats.LOW_STOCK_COUNT,       icon: AlertTriangle, accent: 'text-amber-600', accentBg: 'bg-amber-50' },
      { label: 'Active Medicines', value: activeMedicines, icon: Pill, accent: 'text-teal-600', accentBg: 'bg-teal-50', trend: { value: 8, up: true } },
    ] : user?.role === 'supplier' ? [
      { label: 'Orders Today', value: ordersToday, icon: Calendar, accent: 'text-blue-600', accentBg: 'bg-blue-50', trend: { value: supplierPerf?.dayChange ?? 0, up: (supplierPerf?.dayChange || 0) >= 0 } },
      { label: 'Orders to Complete', value: ordersToReceive, icon: Truck, accent: 'text-teal-600', accentBg: 'bg-teal-50' },
      { label: 'Low Stock Items', value: stats.LOW_STOCK_COUNT,       icon: AlertTriangle, accent: 'text-amber-600', accentBg: 'bg-amber-50' },
      { label: 'Active Medicines', value: activeMedicines, icon: Pill, accent: 'text-teal-600', accentBg: 'bg-teal-50', trend: { value: 8, up: true } },
    ] : [
      { label: 'Total Patients',  value: stats.TOTAL_ACTIVE_PATIENTS, icon: Users,     accent: 'text-blue-600', accentBg: 'bg-blue-50', trend: { value: 12, up: true } },
      { label: 'Appointments Today', value: stats.TODAY_APPOINTMENTS, icon: Calendar,  accent: 'text-teal-600', accentBg: 'bg-teal-50', trend: { value: 5,  up: true } },
      { label: 'Low Stock Items', value: stats.LOW_STOCK_COUNT,       icon: AlertTriangle, accent: 'text-amber-600', accentBg: 'bg-amber-50' },
      { label: 'Active Medicines', value: activeMedicines, icon: Pill, accent: 'text-teal-600', accentBg: 'bg-teal-50', trend: { value: 8, up: true } },
    ]
  ) : [];

  const roleGreeting: Record<string, string> = {
    admin:      'System Overview',
    doctor:     "Today's Schedule",
    pharmacist: 'Inventory Dashboard',
    supplier:   'Supply Dashboard',
    patient:    'My Health Dashboard',
  };

  const patientAppointments = appointments;
  const patientPrescriptions = prescriptions;
  const patientStatusData = [
    { name: 'Scheduled', value: patientAppointments.filter((appt) => String(getValue(appt, 'STATUS', 'status') || '').toLowerCase() === 'scheduled').length },
    { name: 'Completed', value: patientAppointments.filter((appt) => String(getValue(appt, 'STATUS', 'status') || '').toLowerCase() === 'completed').length },
    { name: 'Cancelled', value: patientAppointments.filter((appt) => String(getValue(appt, 'STATUS', 'status') || '').toLowerCase() === 'cancelled').length },
  ].filter((item) => item.value > 0);

  const monthlyActivityMap = new Map<string, { appointments: number; prescriptions: number }>();
  patientAppointments.forEach((appt) => {
    const key = monthKey(getValue(appt, 'APPOINTMENT_DATE', 'appointment_date'));
    const current = monthlyActivityMap.get(key) || { appointments: 0, prescriptions: 0 };
    current.appointments += 1;
    monthlyActivityMap.set(key, current);
  });
  patientPrescriptions.forEach((prescription) => {
    const key = monthKey(getValue(prescription, 'CREATED_AT', 'created_at'));
    const current = monthlyActivityMap.get(key) || { appointments: 0, prescriptions: 0 };
    current.prescriptions += 1;
    monthlyActivityMap.set(key, current);
  });
  const patientActivityData = Array.from(monthlyActivityMap.entries())
    .map(([month, value]) => ({ month, ...value }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const patientAppointmentsToday = patientAppointments.filter((appt) =>
    isToday(getValue(appt, 'APPOINTMENT_DATE', 'appointment_date'))
  );
  const recentPrescriptions = [...patientPrescriptions]
    .sort((a, b) => String(getValue(b, 'CREATED_AT', 'created_at') || '').localeCompare(String(getValue(a, 'CREATED_AT', 'created_at') || '')))
    .slice(0, 5);

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

  if (user?.role === 'patient') {
    const patientName = patientProfile?.full_name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Patient';

    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">My Health Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Welcome back, {patientName}. Here are your appointments today and your prescriptions.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {[
            { label: 'Appointments Today', value: patientAppointmentsToday.length, icon: Calendar, accent: 'text-teal-600', accentBg: 'bg-teal-50' },
            { label: 'Prescriptions', value: patientPrescriptions.length, icon: FileText, accent: 'text-blue-600', accentBg: 'bg-blue-50' },
          ].map((card, idx) => {
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
                      <span className="text-xs text-slate-500">Patient-specific data only</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Today's Appointments</h3>
                <p className="text-xs text-muted-foreground">Only your appointments scheduled for today</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border p-4 bg-white">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={patientStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {patientStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-auto pr-1">
                {patientAppointmentsToday.map((appt, index) => (
                  <div key={getValue(appt, 'APPOINTMENT_ID', 'appointment_id') || index} className="rounded-2xl border border-border p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{getValue(appt, 'DOCTOR_NAME', 'doctor_name') || 'Doctor'}</p>
                        <p className="text-xs text-muted-foreground">{getValue(appt, 'SPECIALIZATION', 'specialization') || 'Specialist'}</p>
                      </div>
                      <span className="text-xs bg-meridian-50 text-meridian-700 px-2 py-1 rounded-full">
                        {getValue(appt, 'STATUS', 'status') || 'Scheduled'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{getValue(appt, 'APPOINTMENT_TIME', 'appointment_time') || 'Time pending'}</span>
                      <span>{getValue(appt, 'REASON', 'reason') || 'No reason provided'}</span>
                    </div>
                  </div>
                ))}
                {patientAppointmentsToday.length === 0 && (
                  <p className="text-sm text-muted-foreground">You do not have any appointments today.</p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <h3 className="font-semibold text-foreground mb-4">Prescription Summary</h3>
            <div className="space-y-3">
              {recentPrescriptions.map((prescription, index) => (
                <div key={getValue(prescription, 'PRESCRIPTION_ID', 'prescription_id') || index} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getValue(prescription, 'DOCTOR_NAME', 'doctor_name') || 'Doctor'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getValue(prescription, 'PRESCRIPTION_NOTES', 'prescription_notes') || getValue(prescription, 'NOTES', 'notes') || 'No notes'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-meridian-700 bg-meridian-50 px-2 py-1 rounded-full flex-shrink-0">
                    {Number(getValue(prescription, 'MEDICINE_COUNT', 'medicine_count') || 0)} meds
                  </span>
                </div>
              ))}
              {recentPrescriptions.length === 0 && (
                <p className="text-sm text-muted-foreground">No prescriptions recorded yet.</p>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Your Activity</h3>
              <p className="text-xs text-muted-foreground">Appointments and prescriptions by month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={patientActivityData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="appointments" name="Appointments" fill="#1d9a88" radius={[6, 6, 0, 0]} />
              <Bar dataKey="prescriptions" name="Prescriptions" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {patientActivityData.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">No activity data available yet.</p>
          )}
        </motion.div>
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
