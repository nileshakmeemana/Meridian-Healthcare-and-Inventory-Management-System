'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'meridian-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, user }) => ({ token, user }),
      // localStorage is synchronous, so this can run while the store is still being created —
      // use the state handed to the callback rather than referencing `useAuth` itself.
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

// Safety net: if rehydration finished before any listener existed, mark it on first client tick
if (typeof window !== 'undefined') {
  queueMicrotask(() => { if (useAuth.persist.hasHydrated() && !useAuth.getState().hydrated) useAuth.getState().setHydrated(); });
  useAuth.persist.onFinishHydration(() => useAuth.getState().setHydrated());
}
