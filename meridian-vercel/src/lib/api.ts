'use client';
import axios from 'axios';
import { useAuth } from '@/store/auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api', // same origin: served by src/pages/api/[...path].ts
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Inject the JWT on every request
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired / invalid session sends the user back to sign in
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/login') && typeof window !== 'undefined') {
      useAuth.getState().logout();
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  }
);

/** GET helper that unwraps { success, data } */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get(url, { params });
  return res.data.data as T;
}
