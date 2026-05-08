'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, X, Pill, Mail, Lock, Phone } from 'lucide-react'
import { adminAPI } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'

const SHIFTS = ['Morning', 'Afternoon', 'Night']

export default function PharmacistsPage() {
  const [pharmacists, setPharmacists] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPharmacist, setEditPharmacist] = useState<any>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '', 
    password: '', 
    shift: 'Morning',
    license_number: '',
    phone: '',
    registration_number: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPharmacists()
  }, [])

  const loadPharmacists = async () => {
    try {
      const r = await adminAPI.getPharmacists()
      setPharmacists(r.data?.data || [])
    } catch (err) {
      setPharmacists([])
    }
  }

  const filtered = pharmacists.filter(p => {
    const matchSearch = `${p.FIRST_NAME} ${p.LAST_NAME}`.toLowerCase().includes(search.toLowerCase()) ||
      p.EMAIL?.toLowerCase().includes(search.toLowerCase()) ||
      p.SHIFT?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const openCreate = () => {
    setEditPharmacist(null)
    setError('')
    setForm({ 
      first_name: '', 
      last_name: '', 
      email: '', 
      password: '', 
      shift: 'Morning',
      license_number: '',
      phone: '',
      registration_number: ''
    })
    setShowModal(true)
  }

  const openEdit = (p: any) => {
    setEditPharmacist(p)
    setError('')
    setForm({
      first_name: p.FIRST_NAME,
      last_name: p.LAST_NAME,
      email: p.EMAIL,
      password: '',
      shift: p.SHIFT || 'Morning',
      license_number: p.LICENSE_NUMBER,
      phone: p.PHONE || '',
      registration_number: p.REGISTRATION_NUMBER || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editPharmacist) {
        await adminAPI.updatePharmacist(editPharmacist.PHARMACIST_ID, form)
      } else {
        await adminAPI.createPharmacist(form)
      }
      await loadPharmacists()
      setShowModal(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save pharmacist')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p: any) => {
    try {
      await adminAPI.togglePharmacistStatus(p.PHARMACIST_ID)
      await loadPharmacists()
    } catch {}
  }

  const deletePharmacist = async (p: any) => {
    if (confirm(`Are you sure you want to delete ${p.FIRST_NAME} ${p.LAST_NAME}?`)) {
      try {
        await adminAPI.deletePharmacist(p.PHARMACIST_ID)
        await loadPharmacists()
      } catch {}
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacist Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system pharmacists and their profiles</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Pharmacist
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pharmacists..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Pharmacist', 'Shift', 'Contact', 'License', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.PHARMACIST_ID}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-xs">
                        {getInitials(`${p.FIRST_NAME} ${p.LAST_NAME}`)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.FIRST_NAME} {p.LAST_NAME}</p>
                        <p className="text-xs text-gray-500">{p.EMAIL}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {p.SHIFT}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5" />
                      {p.PHONE || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{p.LICENSE_NUMBER}</td>
                  <td className="px-5 py-4">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', p.IS_ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {p.IS_ACTIVE ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                        {p.IS_ACTIVE ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deletePharmacist(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No pharmacists found</div>
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
                <h2 className="text-xl font-bold text-gray-900">{editPharmacist ? 'Edit Pharmacist' : 'Add New Pharmacist'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {[
                  { key: 'first_name', label: 'First Name', type: 'text', placeholder: 'Nimal' },
                  { key: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Silva' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'pharmacist@meridian.com' },
                  ...(!editPharmacist ? [{ key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }] : []),
                  { key: 'shift', label: 'Shift', type: 'select', options: SHIFTS },
                  { key: 'license_number', label: 'License Number', type: 'text', placeholder: 'SLPC-2020-001' },
                  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+94-71-1234567' },
                  { key: 'registration_number', label: 'Registration Number', type: 'text', placeholder: 'REG-2020-001' },
                ].map((field: any) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(form as any)[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                      >
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(form as any)[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                      />
                    )}
                  </div>
                ))}
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
                  {saving ? 'Saving...' : editPharmacist ? 'Save Changes' : 'Create Pharmacist'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
