'use client';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RouterProvider } from 'react-aria-components';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Calendar, Inbox01 } from '@untitledui/icons';
import { useAuth } from '@/store/auth';
import { useCounts } from '@/store/counts';
import { SidebarNavigation } from '@/components/untitled/sidebar-navigation';
import { FeaturedCard } from '@/components/untitled/featured-card';
import { Skeleton } from '@/components/ui/skeleton';
import { NAV, PAGE_TITLES } from './nav-config';
import { AppHeader } from './app-header';

function useFeatured() {
  const role = useAuth((s) => s.user?.role);
  const c = useCounts();
  if (role === 'admin' || role === 'pharmacist') {
    return (
      <FeaturedCard
        title="Stock Monitor" emoji={c.lowStock ? '⚠️' : '❄️'}
        description={c.lowStock ? `${c.lowStock} item${c.lowStock > 1 ? 's are' : ' is'} at or below reorder level${c.critical ? `, ${c.critical} expired` : ''}.` : 'All shelves are above reorder level.'}
        action={{ label: 'Review stock', href: '/dashboard/medicines?status=Low,Critical,Expired', icon: Activity }}
        secondary={{ label: 'Logs', href: '/dashboard/sales' }}
      />
    );
  }
  if (role === 'doctor') {
    return (
      <FeaturedCard title="Today's Clinic" emoji="🩺"
        description={c.todayAppointments ? `${c.todayAppointments} patient${c.todayAppointments > 1 ? 's' : ''} booked with you today.` : 'No patients booked for today.'}
        action={{ label: 'Schedule', href: '/dashboard/appointments', icon: Calendar }} secondary={{ label: 'Requests', href: '/dashboard/requests' }} />
    );
  }
  if (role === 'supplier') {
    return (
      <FeaturedCard title="Restock Queue" emoji="🚚"
        description={c.openSupplierRequests ? `${c.openSupplierRequests} open request${c.openSupplierRequests > 1 ? 's' : ''} waiting for a supplier.` : 'No open restock requests right now.'}
        action={{ label: 'View requests', href: '/dashboard/requests', icon: Inbox01 }} secondary={{ label: 'Orders', href: '/dashboard/supply-orders' }} />
    );
  }
  return (
    <FeaturedCard title="Your Next Visit" emoji="📅"
      description={c.upcomingVisits ? `You have ${c.upcomingVisits} upcoming appointment${c.upcomingVisits > 1 ? 's' : ''}.` : 'Need to see a doctor? Book a slot in seconds.'}
      action={{ label: c.upcomingVisits ? 'View visits' : 'Book visit', href: c.upcomingVisits ? '/dashboard/appointments' : '/dashboard/appointments?new=1', icon: Calendar }}
      secondary={{ label: 'Doctors', href: '/dashboard/doctors' }} />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, token, hydrated, logout } = useAuth();
  const refresh = useCounts((s) => s.refresh);
  const router = useRouter();
  const pathname = usePathname() ?? ''; // null-safe: a pages/ dir (the API bridge) widens the type
  const featured = useFeatured();

  // Auth guard runs only after zustand has rehydrated from localStorage
  useEffect(() => {
    if (hydrated && (!token || !user)) router.replace('/login');
  }, [hydrated, token, user, router]);

  useEffect(() => {
    if (!user) return;
    refresh(user.role);
    const t = setInterval(() => refresh(user.role), 60_000);
    return () => clearInterval(t);
  }, [user, refresh, pathname]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-dvh">
        <div className="hidden w-64 border-r border-slate-200/80 bg-sidebar p-5 lg:block"><Skeleton className="h-9 w-40" /></div>
        <div className="flex-1 space-y-6 p-8"><Skeleton className="h-8 w-64" /><div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div></div>
      </div>
    );
  }

  const signOut = () => { logout(); router.replace('/login'); };
  const base = Object.keys(PAGE_TITLES).filter((k) => pathname === k || pathname.startsWith(`${k}/`)).sort((a, b) => b.length - a.length)[0];
  const title = PAGE_TITLES[base] ?? 'Overview';
  const staff = user.role === 'admin' || user.role === 'pharmacist' || user.role === 'doctor';

  return (
    <RouterProvider navigate={router.push}>
      <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
        <SidebarNavigation
          activeUrl={pathname}
          sections={NAV[user.role]}
          featured={featured}
          onSignOut={signOut}
          searchPlaceholder={staff ? 'Search items, SKU…' : 'Search menu'}
          searchFallback={staff ? (q) => `/dashboard/medicines?q=${encodeURIComponent(q)}` : undefined}
        />
        <main className="flex min-w-0 flex-1 flex-col">
          <AppHeader user={user} title={title} onSignOut={signOut} />
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </RouterProvider>
  );
}
