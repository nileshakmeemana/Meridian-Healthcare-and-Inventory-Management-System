'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, X, Phone } from 'lucide-react'
import { adminAPI, doctorAPI, appointmentAPI } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const SPECIALIZATIONS = ['Cardiology', 'General Medicine', 'Pediatrics', 'Orthopedics', 'Neurology', 'Dermatology', 'Psychiatry', 'Ophthalmology']

export default function DoctorsPage() {
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editDoctor, setEditDoctor] = useState<any>(null)
  const [form, setForm] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '', 
    password: '', 
    specialization: 'General Medicine',
    license_number: '',
    phone: '',
    experience_years: 0,
    consultation_fee: 0
  })
  const [saving, setSaving] = useState(false)

  const getValue = (row: any, upper: string, lower: string) => row?.[upper] ?? row?.[lower]

  useEffect(() => {
    loadDoctors()
  }, [user?.role])

  const loadDoctors = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await adminAPI.getDoctors({ _t: Date.now() }).catch(() => doctorAPI.getAll({ _t: Date.now() }))
      const doctorRows = response.data?.data || response.data?.rows || (Array.isArray(response.data) ? response.data : [])
      let normalized = doctorRows.map((d: any) => {
        const firstName = getValue(d, 'FIRST_NAME', 'first_name')
        const lastName = getValue(d, 'LAST_NAME', 'last_name')
        const fullNameValue = getValue(d, 'FULL_NAME', 'full_name')
        if (firstName || lastName) {
          return {
            ...d,
            FIRST_NAME: firstName || '',
            LAST_NAME: lastName || '',
            EMAIL: getValue(d, 'EMAIL', 'email') || '',
            PHONE: getValue(d, 'PHONE', 'phone') || '',
            SPECIALIZATION: getValue(d, 'SPECIALIZATION', 'specialization') || 'General Medicine',
            IS_ACTIVE: getValue(d, 'IS_ACTIVE', 'is_active'),
            DOCTOR_ID: getValue(d, 'DOCTOR_ID', 'doctor_id'),
            EXPERIENCE_YEARS: getValue(d, 'EXPERIENCE_YEARS', 'experience_years') || 0,
            CONSULTATION_FEE: getValue(d, 'CONSULTATION_FEE', 'consultation_fee') || 0,
            LICENSE_NUMBER: getValue(d, 'LICENSE_NUMBER', 'license_number') || '',
          }
        }
        const fullName = String(fullNameValue || '').trim()
        const [parsedFirstName = '', ...rest] = fullName.split(' ')
        return {
          ...d,
          FIRST_NAME: parsedFirstName,
          LAST_NAME: rest.join(' '),
          PHONE: getValue(d, 'PHONE', 'phone') || '',
          EMAIL: getValue(d, 'EMAIL', 'email') || '',
          SPECIALIZATION: getValue(d, 'SPECIALIZATION', 'specialization') || 'General Medicine',
          IS_ACTIVE: getValue(d, 'IS_ACTIVE', 'is_active'),
          DOCTOR_ID: getValue(d, 'DOCTOR_ID', 'doctor_id'),
          EXPERIENCE_YEARS: getValue(d, 'EXPERIENCE_YEARS', 'experience_years') || 0,
          CONSULTATION_FEE: getValue(d, 'CONSULTATION_FEE', 'consultation_fee') || 0,
          LICENSE_NUMBER: getValue(d, 'LICENSE_NUMBER', 'license_number') || '',
        }
      })

      if (normalized.length === 0) {
        const apptRes = await appointmentAPI.getAll({ _t: Date.now() })
        const appts = apptRes.data?.data || []
        const doctorMap = new Map<string, any>()
        appts.forEach((a: any, idx: number) => {
          const doctorNameRaw = String(a.DOCTOR_NAME || a.doctor_name || '').trim().replace(/^Dr\.\s*/i, '')
          if (!doctorNameRaw) return
          const key = doctorNameRaw.toLowerCase()
          const existing = doctorMap.get(key)
          const [first = '', ...rest] = doctorNameRaw.split(' ')
          doctorMap.set(key, {
            DOCTOR_ID: existing?.DOCTOR_ID || a.DOCTOR_ID || a.doctor_id || idx + 1,
            FIRST_NAME: existing?.FIRST_NAME || first,
            LAST_NAME: existing?.LAST_NAME || rest.join(' '),
            EMAIL: existing?.EMAIL || '',
            PHONE: existing?.PHONE || '',
            SPECIALIZATION: existing?.SPECIALIZATION || a.SPECIALIZATION || a.specialization || 'General Medicine',
            IS_ACTIVE: true,
            EXPERIENCE_YEARS: existing?.EXPERIENCE_YEARS || 0,
            CONSULTATION_FEE: existing?.CONSULTATION_FEE || 0,
            LICENSE_NUMBER: existing?.LICENSE_NUMBER || '',
          })
        })
        normalized = Array.from(doctorMap.values())
      }

      setDoctors(normalized)
    } catch (err) {
      setDoctors([])
      setLoadError((err as any)?.response?.data?.message || 'Unable to load doctors')
    } finally {
      setLoading(false)
    }
  }

  const filtered = doctors.filter(d => {
    const matchSearch = `${d.FIRST_NAME} ${d.LAST_NAME}`.toLowerCase().includes(search.toLowerCase()) ||
      d.EMAIL?.toLowerCase().includes(search.toLowerCase()) ||
      d.SPECIALIZATION?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const openCreate = () => {
    setEditDoctor(null)
    setForm({ 
      first_name: '', 
      last_name: '', 
      email: '', 
      password: '', 
      specialization: 'General Medicine',
      license_number: '',
      phone: '',
      experience_years: 0,
      consultation_fee: 0
    })
    setShowModal(true)
  }

  const openEdit = (d: any) => {
    setEditDoctor(d)
    setForm({
      first_name: d.FIRST_NAME,
      last_name: d.LAST_NAME,
      email: d.EMAIL,
      password: '',
      specialization: d.SPECIALIZATION,
      license_number: d.LICENSE_NUMBER,
      phone: d.PHONE || '',
      experience_years: d.EXPERIENCE_YEARS || 0,
      consultation_fee: d.CONSULTATION_FEE || 0
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editDoctor) {
        await adminAPI.updateDoctor(editDoctor.DOCTOR_ID, form)
        await loadDoctors()
      } else {
        const res = await adminAPI.createDoctor(form)
        if (res.data?.data) {
          await loadDoctors()
        } else {
          await loadDoctors()
        }
      }
      setShowModal(false)
    } catch (err) {}
    setShowModal(false)
    setSaving(false)
  }

  const toggleActive = async (d: any) => {
    try {
      await adminAPI.toggleDoctorStatus(d.DOCTOR_ID)
      await loadDoctors()
    } catch {}
  }

  const deleteDoctor = async (d: any) => {
    if (confirm(`Are you sure you want to delete Dr. ${d.FIRST_NAME} ${d.LAST_NAME}?`)) {
      try {
        await adminAPI.deleteDoctor(d.DOCTOR_ID)
        await loadDoctors()
      } catch {}
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system doctors and their profiles</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search doctors..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Doctor', 'Specialization', 'Contact', 'Experience', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map((d, i) => (
                <motion.tr
                  key={d.DOCTOR_ID}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-xs">
                        {getInitials(`${d.FIRST_NAME} ${d.LAST_NAME}`)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Dr. {d.FIRST_NAME} {d.LAST_NAME}</p>
                        <p className="text-xs text-gray-500">{d.EMAIL}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{d.SPECIALIZATION}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5" />
                      {d.PHONE || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{d.EXPERIENCE_YEARS || 0} years</td>
                  <td className="px-5 py-4">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', d.IS_ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {d.IS_ACTIVE ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(d)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                        {d.IS_ACTIVE ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteDoctor(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {loading && (
          <div className="text-center py-12 text-gray-400 text-sm">Loading doctors...</div>
        )}
        {!loading && loadError && (
          <div className="text-center py-10 border-t bg-red-50 border-red-100">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No doctors found</div>
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
                <h2 className="text-xl font-bold text-gray-900">{editDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {[
                  { key: 'first_name', label: 'First Name', type: 'text', placeholder: 'John' },
                  { key: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Silva' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'doctor@meridian.com' },
                  ...(!editDoctor ? [{ key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }] : []),
                  { key: 'specialization', label: 'Specialization', type: 'select', options: SPECIALIZATIONS },
                  { key: 'license_number', label: 'License Number', type: 'text', placeholder: 'SLMC-2020-001' },
                  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+94-71-1234567' },
                  { key: 'experience_years', label: 'Experience (years)', type: 'number', placeholder: '5' },
                  { key: 'consultation_fee', label: 'Consultation Fee', type: 'number', placeholder: '2500' },
                ].map((field: any) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(form as any)[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                      >
                        {field.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(form as any)[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
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
                  {saving ? 'Saving...' : editDoctor ? 'Save Changes' : 'Create Doctor'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
