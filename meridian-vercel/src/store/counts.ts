'use client';
import { create } from 'zustand';
import { get } from '@/lib/api';
import type { Role } from '@/lib/types';

/** Sidebar badges + header notification dot. Pages call refresh() after mutations. */
interface Counts {
  lowStock: number; critical: number; pendingRequests: number; unread: number; todayAppointments: number;
  openSupplierRequests: number; inTransit: number; upcomingVisits: number;
  refresh: (role?: Role) => Promise<void>;
}

export const useCounts = create<Counts>((set) => ({
  lowStock: 0, critical: 0, pendingRequests: 0, unread: 0, todayAppointments: 0,
  openSupplierRequests: 0, inTransit: 0, upcomingVisits: 0,
  refresh: async (role) => {
    try {
      const notif = await get<{ unread: number }>('/notifications', { limit: 1 });
      set({ unread: notif.unread });
      if (!role) return;
      const home = await get<Record<string, number>>('/reports/home');
      if (role === 'admin' || role === 'pharmacist') {
        set({ lowStock: home.lowStockCount, critical: home.expiredCount, pendingRequests: home.pendingRequests, todayAppointments: home.todayAppointments });
      } else if (role === 'doctor') {
        set({ todayAppointments: home.todayCount, pendingRequests: home.openRequests });
      } else if (role === 'supplier') {
        set({ openSupplierRequests: home.openRequests, inTransit: home.inTransit });
      } else if (role === 'patient') {
        set({ upcomingVisits: home.upcoming });
      }
    } catch { /* the API may be offline — badges simply stay at zero */ }
  },
}));
