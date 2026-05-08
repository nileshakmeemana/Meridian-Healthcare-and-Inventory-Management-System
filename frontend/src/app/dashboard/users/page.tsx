'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, X, User, Mail, Lock, Stethoscope, Pill, Truck } from 'lucide-react'
import { adminAPI } from '@/lib/api'
import { cn, getInitials, getRoleBadgeColor } from '@/lib/utils'

const roleIcons: Record<string, any> = {
  doctor: Stethoscope,
  pharmacist: Pill,
  supplier: Truck,
  admin: User,
  patient: User,
}

const ROLES = ['doctor', 'pharmacist', 'supplier']

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'doctor', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const r = await adminAPI.getUsers()
      setUsers(r.data?.data || [])
    } catch (err) {
      setUsers([])
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.FULL_NAME?.toLowerCase().includes(search.toLowerCase()) ||
      u.EMAIL?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'All' || u.ROLE === roleFilter
    return matchSearch && matchRole
  })

  const openCreate = () => {
    setEditUser(null)
    setForm({ full_name: '', email: '', password: '', role: 'doctor', phone: '' })
    setShowModal(true)
  }

  const openEdit = (u: any) => {
    setEditUser(u)
    setForm({ full_name: u.FULL_NAME, email: u.EMAIL, password: '', role: u.ROLE, phone: u.PHONE || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editUser) {
        await adminAPI.updateUser(editUser.USER_ID, form)
        await loadUsers()
      } else {
        const res = await adminAPI.createUser(form)
        // If backend returns created user, refresh list; otherwise reload
        if (res.data?.data) {
          await loadUsers()
        } else {
          await loadUsers()
        }
      }
      setShowModal(false)
    } catch (err) {}
    setShowModal(false)
    setSaving(false)
  }

  const toggleActive = async (u: any) => {
    try {
      await adminAPI.toggleUserStatus(u.USER_ID)
      // reload users to respect server-side is_active filter
      await loadUsers()
    } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users and their access</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
        </div>
        {['All', ...ROLES].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize',
              roleFilter === r
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
            )}
          >{r}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['User', 'Role', 'Contact', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map((u, i) => {
                const RoleIcon = roleIcons[u.ROLE] || User
                return (
                  <motion.tr
                    key={u.USER_ID}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-xs">
                          {getInitials(u.FULL_NAME)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.FULL_NAME}</p>
                          <p className="text-xs text-gray-500">{u.EMAIL}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border capitalize', getRoleBadgeColor(u.ROLE))}>
                        <RoleIcon className="w-3 h-3" />{u.ROLE}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{u.PHONE || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', u.IS_ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                        {u.IS_ACTIVE ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                          {u.IS_ACTIVE ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No users found</div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{editUser ? 'Edit User' : 'Add New User'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'full_name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe' },
                  { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'john@meridian.com' },
                  { key: 'phone', label: 'Phone', icon: null, type: 'tel', placeholder: '+1-555-0000' },
                  ...(!editUser ? [{ key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••' }] : []),
                ].map((field: any) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 capitalize"
                  >
                    {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
