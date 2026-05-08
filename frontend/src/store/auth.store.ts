// src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  userId:      number;
  username:    string;
  email:       string;
  role:        'admin' | 'doctor' | 'pharmacist' | 'supplier' | 'patient';
  profileId?:  number;
  firstName?:  string;
  lastName?:   string;
  phone?:      string;
  companyName?: string;
  specialization?: string;
}

interface AuthState {
  token:   string | null;
  user:    User | null;
  isAuthenticated: boolean;
  setAuth:  (token: string, user: User) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      user:            null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        localStorage.setItem('meridian_token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('meridian_token');
        localStorage.removeItem('meridian_user');
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'meridian-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
