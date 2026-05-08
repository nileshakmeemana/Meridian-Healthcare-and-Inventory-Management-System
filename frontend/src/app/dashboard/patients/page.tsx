'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Calendar, Droplets, Phone, Mail, ChevronRight, Activity, Plus } from 'lucide-react'
import { patientAPI, adminAPI } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const bloodGroupColors: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-100 text-red-700',
  'B+': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-100 text-blue-700',
  'O+': 'bg-emerald-100 text-emerald-700', 'O-': 'bg-emerald-100 text-emerald-700',
  'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-100 text-purple-700',
}

export default function PatientsPage() {
  const { user } = useAuthStore()
  const [patients, setPatients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [genderFilter, setGenderFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', date_of_birth: '', gender: 'Male', blood_group: '', phone: '', address: '', emergency_contact: '', emergency_phone: '' })

  useEffect(() => {
    patientAPI.getAll()
      .then(r => { if (r.data?.data?.length) setPatients(r.data.data) })
      .catch(() => setPatients([]))
  }, [])

  const openAdd = () => setShowAdd(true)
  const closeAdd = () => {
    setShowAdd(false)
    setForm({ first_name: '', last_name: '', email: '', password: '', date_of_birth: '', gender: 'Male', blood_group: '', phone: '', address: '', emergency_contact: '', emergency_phone: '' })
  }

  const createPatient = async () => {
    setCreating(true)
    try {
      const res = await adminAPI.createPatient(form)
      if (res.data?.data) {
        setPatients(prev => [res.data.data, ...prev])
        closeAdd()
      }
    } catch (err) {
      // TODO: show error
    } finally {
      setCreating(false)
    }
  }

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = (p.FULL_NAME || '').toLowerCase().includes(q) || (p.EMAIL || '').toLowerCase().includes(q)
    const matchGender = genderFilter === 'All' || p.GENDER === genderFilter
    return matchSearch && matchGender
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} total registered patients</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">{patients.filter(p => p.IS_ACTIVE).length} Active</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients by name or email..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
        </div>
        {['All', 'Male', 'Female'].map(g => (
          <button key={g} onClick={() => setGenderFilter(g)} className={cn('px-4 py-2.5 rounded-xl text-sm font-medium border transition-all', genderFilter === g ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300')}>
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((patient, i) => (
            <motion.div key={patient.PATIENT_ID || i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }} onClick={() => setSelected(patient)} className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-teal-200 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">{getInitials(patient.FULL_NAME)}</div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{patient.FULL_NAME}</p>
                    <p className="text-xs text-gray-500">{patient.GENDER} · {patient.AGE} yrs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', bloodGroupColors[patient.BLOOD_GROUP] || 'bg-gray-100 text-gray-600')}><Droplets className="inline w-3 h-3 mr-0.5" />{patient.BLOOD_GROUP}</span>
                  <div className={cn('w-2 h-2 rounded-full', patient.IS_ACTIVE ? 'bg-emerald-400' : 'bg-gray-300')} />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /><span className="truncate">{patient.EMAIL}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /><span>{patient.PHONE}</span></div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="w-3.5 h-3.5" /><span>{patient.TOTAL_APPOINTMENTS} appointments</span></div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No patients found</p></div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">{getInitials(selected.FULL_NAME)}</div>
                <h2 className="text-xl font-bold text-gray-900">{selected.FULL_NAME}</h2>
                <p className="text-sm text-gray-500">{selected.GENDER} · {selected.AGE} years old</p>
              </div>
              <div className="space-y-3">{[
                { label: 'Email', value: selected.EMAIL },
                { label: 'Phone', value: selected.PHONE },
                { label: 'Blood Group', value: selected.BLOOD_GROUP },
                { label: 'Address', value: selected.ADDRESS || 'Not provided' },
                { label: 'Status', value: selected.IS_ACTIVE ? 'Active' : 'Inactive' },
                { label: 'Total Appointments', value: selected.TOTAL_APPOINTMENTS },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">{item.label}</span><span className="text-sm font-medium text-gray-800">{item.value}</span></div>
              ))}</div>
              <button onClick={() => setSelected(null)} className="mt-6 w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Close</button>
            </motion.div>
          </motion.div>
        )}

        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => closeAdd()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
              <h3 className="text-lg font-semibold mb-4">Add Patient</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" className="col-span-1 p-2 border rounded-md" />
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" className="col-span-1 p-2 border rounded-md" />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="col-span-2 p-2 border rounded-md" />
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" className="col-span-2 p-2 border rounded-md" />
                <input value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} placeholder="YYYY-MM-DD" className="col-span-1 p-2 border rounded-md" />
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="col-span-1 p-2 border rounded-md"><option>Male</option><option>Female</option></select>
                <select value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))} className="col-span-2 p-2 border rounded-md">
                  <option value="">Blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="col-span-2 p-2 border rounded-md" />
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" className="col-span-2 p-2 border rounded-md" />
                <input value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Emergency contact" className="col-span-1 p-2 border rounded-md" />
                <input value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} placeholder="Emergency phone" className="col-span-1 p-2 border rounded-md" />
              </div>
              <div className="mt-4 flex justify-end gap-2"><button onClick={closeAdd} className="px-4 py-2 rounded-xl bg-gray-100">Cancel</button><button onClick={createPatient} disabled={creating} className="px-4 py-2 rounded-xl bg-teal-600 text-white">{creating ? 'Creating...' : 'Create'}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

