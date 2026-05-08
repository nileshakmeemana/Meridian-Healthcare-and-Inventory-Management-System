'use client';
// src/app/dashboard/reports/page.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Package, Users, Award } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { reportAPI } from '@/lib/api';

const COLORS = ['#1d9a88','#2563eb','#d97706','#dc2626','#7c3aed','#ec4899','#06b6d4','#84cc16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground mt-1" style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [topMeds,    setTopMeds]    = useState<any[]>([]);
  const [apptStats,  setApptStats]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [dateRange,  setDateRange]  = useState({ start: '2026-02-01', end: '2026-05-06' });

  const parseMedicineReportRow = (med: any, index: number) => ({
    MEDICINE_NAME: med.medicine_name ?? med.MEDICINE_NAME ?? med.name ?? med.NAME ?? 'Unknown',
    CATEGORY: med.category ?? med.CATEGORY ?? 'N/A',
    TOTAL_UNITS_SOLD: Number(med.total_prescribed ?? med.TOTAL_PRESCRIBED ?? 0),
    UNIQUE_PATIENTS: Number(med.unique_patients ?? med.UNIQUE_PATIENTS ?? 0),
    RANK_POSITION: Number(med.medicine_rank ?? med.MEDICINE_RANK ?? index + 1),
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [medsRes, apptRes] = await Promise.all([
          reportAPI.mostUsedMedicines({ topN: 10, startDate: dateRange.start, endDate: dateRange.end }),
          reportAPI.appointmentStats(),
        ]);
        setTopMeds((medsRes.data.data || []).map(parseMedicineReportRow));
        const grouped = (apptRes.data.data || []).reduce((acc: any[], row: any) => {
          const monthKey = String(row.month).slice(0, 7);
          let entry = acc.find((item) => item.MONTH === monthKey);
          if (!entry) {
            entry = { MONTH: monthKey, TOTAL: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 };
            acc.push(entry);
          }
          const total = Number(row.total || 0);
          entry.TOTAL += total;
          const status = String(row.status || '').toLowerCase();
          if (status === 'completed') entry.COMPLETED += total;
          else if (status === 'cancelled') entry.CANCELLED += total;
          else entry.NO_SHOW += total;
          return acc;
        }, []);
        setApptStats(grouped);
      } catch {
        setTopMeds([]);
        setApptStats([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateRange]);

  // Category breakdown for pie
  const categoryData = topMeds.reduce((acc: any[], med) => {
    const existing = acc.find(a => a.name === med.CATEGORY);
    if (existing) { existing.value += med.TOTAL_UNITS_SOLD; }
    else acc.push({ name: med.CATEGORY, value: med.TOTAL_UNITS_SOLD });
    return acc;
  }, []);

  const totalUnits    = topMeds.reduce((s, m) => s + (m.TOTAL_UNITS_SOLD || 0), 0);
  const totalPatients = topMeds.reduce((s, m) => s + (m.UNIQUE_PATIENTS || 0), 0);
  const usedTopMeds = topMeds.filter((med) => Number(med.TOTAL_UNITS_SOLD || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Business Intelligence Dashboard — Advanced Database Report</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Units Dispensed', value: totalUnits.toLocaleString(), icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Patients Served', value: totalPatients.toLocaleString(), icon: Users, color: 'text-meridian-600', bg: 'bg-meridian-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ⭐ WOW FACTOR: Most Used Medicines Report */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-meridian-100 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-meridian-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Most Used Medicines Report</h3>
            <p className="text-xs text-muted-foreground">vw_most_used_medicines · sp_get_most_used_medicines · Advanced BI via Oracle PL/SQL</p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Units Dispensed by Medicine</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usedTopMeds.slice(0, 8)} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="MEDICINE_NAME" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="TOTAL_UNITS_SOLD" name="Units Sold" radius={[0, 4, 4, 0]}>
                  {usedTopMeds.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category pie */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Sales by Category</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>

            {/* Rank table */}
            <div className="mt-4 space-y-1.5">
              {usedTopMeds.slice(0, 5).map((med, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: COLORS[i] }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-foreground">{med.MEDICINE_NAME}</span>
                  <span className="text-muted-foreground">{med.TOTAL_UNITS_SOLD} units</span>
                </div>
              ))}
              {usedTopMeds.length === 0 && (
                <p className="text-xs text-muted-foreground">No medicine usage records found for this date range.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
          className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Monthly Appointment Statistics</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={apptStats} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="MONTH" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="COMPLETED" name="Completed" fill="#1d9a88" radius={[2,2,0,0]} stackId="a" />
              <Bar dataKey="CANCELLED" name="Cancelled" fill="#dc2626" radius={[2,2,0,0]} stackId="a" />
              <Bar dataKey="NO_SHOW"   name="No-Show"   fill="#d97706" radius={[2,2,0,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
