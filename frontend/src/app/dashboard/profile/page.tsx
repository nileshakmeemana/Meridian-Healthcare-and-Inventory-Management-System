'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Lock, Shield, Eye, EyeOff, Save, CheckCircle } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { cn, getInitials, getRoleBadgeColor } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore()
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'U'
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'profile' | 'security'>('profile')
  const [form, setForm] = useState({
    full_name: displayName,
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false })
  const [pwdError, setPwdError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleProfileSave = async () => {
    setSaving(true)
    try { await authAPI.getMe() } catch {}
    if (token) setAuth(token, { ...user!, ...form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
  }

  const handlePasswordChange = async () => {
    setPwdError('')
    if (passwords.new !== passwords.confirm) {
      setPwdError('New passwords do not match')
      return
    }
    if (passwords.new.length < 8) {
      setPwdError('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      await authAPI.changePassword({ current_password: passwords.current, new_password: passwords.new })
      setPasswords({ current: '', new: '', confirm: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setPwdError('Current password is incorrect')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-gray-100 p-8"
      >
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-teal-200">
            {getInitials(displayName)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={cn('inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full border capitalize', getRoleBadgeColor(user?.role || ''))}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {(['profile', 'security'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'profile' ? <User className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {t === 'security' ? 'Change Password' : 'Profile Info'}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="space-y-4">
            {[
              { key: 'full_name', label: 'Full Name', icon: User, type: 'text' },
              { key: 'email', label: 'Email Address', icon: Mail, type: 'email' },
              { key: 'phone', label: 'Phone Number', icon: Phone, type: 'tel' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button
                onClick={handleProfileSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
                  saved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                )}
              >
                {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-4">
            {[
              { key: 'current', label: 'Current Password' },
              { key: 'new', label: 'New Password' },
              { key: 'confirm', label: 'Confirm New Password' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={(showPwd as any)[field.key] ? 'text' : 'password'}
                    value={(passwords as any)[field.key]}
                    onChange={e => setPasswords(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => ({ ...p, [field.key]: !(p as any)[field.key] }))}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {(showPwd as any)[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            {pwdError && <p className="text-sm text-red-500">{pwdError}</p>}
            <div className="pt-2">
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
                  saved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                )}
              >
                {saved ? <><CheckCircle className="w-4 h-4" /> Updated!</> : <><Shield className="w-4 h-4" /> Update Password</>}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Role Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl border border-teal-100 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-teal-800">Your Access Level</h3>
        </div>
        <p className="text-sm text-teal-700 capitalize">
          You are logged in as <span className="font-bold">{user?.role}</span>.
          Your permissions are determined by your role in the Meridian system.
        </p>
      </motion.div>
    </div>
  )
}
