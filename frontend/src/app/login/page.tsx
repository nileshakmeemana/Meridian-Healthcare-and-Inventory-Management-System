'use client';
// src/app/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router   = useRouter();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [form,   setForm]    = useState({ email: '', password: '' });
  const [show,   setShow]    = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,  setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(form);
      const { token, user } = res.data;
      setAuth(token, user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Soft background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-meridian-100/70 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-sky-100/70 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-slate-200 border border-slate-100">
            <Activity className="w-9 h-9 text-meridian-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Meridian</h1>
          <p className="text-slate-500 mt-1 text-sm">Healthcare & Inventory Management</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/60"
        >
          <h2 className="text-slate-900 text-xl font-semibold mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to your account</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-5"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <p className="text-rose-700 text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-600 text-sm mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-meridian-400 focus:bg-white transition-all text-sm"
                placeholder="you@meridian.health"
              />
            </div>

            <div>
              <label className="block text-slate-600 text-sm mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-meridian-400 focus:bg-white transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full bg-meridian-600 hover:bg-meridian-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : 'Sign in'}
            </motion.button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-slate-400 text-xs text-center mb-3">Demo credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'Admin',      email: 'admin@meridian.health' },
                { role: 'Doctor',     email: 'silva@meridian.health' },
                { role: 'Pharmacist', email: 'nimal@meridian.health' },
                { role: 'Patient',    email: 'kasun@email.com' },
              ].map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => setForm({ email: cred.email, password: 'Password@123' })}
                  className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
                >
                  <p className="text-slate-700 text-xs font-medium">{cred.role}</p>
                  <p className="text-slate-500 text-xs truncate">{cred.email}</p>
                </button>
              ))}
            </div>
            <p className="text-slate-400 text-xs text-center mt-2">Password: Password@123</p>
          </div>
        </motion.div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © 2026 Meridian Healthcare. NSBM ADBMS Assignment.
        </p>
      </div>
    </div>
  );
}
