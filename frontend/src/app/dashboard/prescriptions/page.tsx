'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Search, X, Pill, Calendar, ChevronDown, Edit2, Trash2 } from 'lucide-react'
import { prescriptionAPI, patientAPI, medicineAPI } from '@/lib/api'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

export default function PrescriptionsPage() {
  const { user } = useAuthStore()
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPrescription, setEditingPrescription] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [medicines, setMedicines] = useState<any[]>([])
  const [detailsById, setDetailsById] = useState<Record<number, any>>({})
  const [form, setForm] = useState({
    patient_id: '',
    diagnosis: '',
    notes: '',
    items: [{ medicine_id: '', quantity: '1', dosage: '', duration: '', instructions: '' }],
  })
  const [saving, setSaving] = useState(false)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const toDateValue = (pres: any) => pres.CREATED_AT || pres.created_at || pres.ISSUED_DATE || pres.issued_date
  const toPatientName = (pres: any) => pres.PATIENT_NAME || pres.patient_name || 'Unknown Patient'
  const toDoctorName = (pres: any) => pres.DOCTOR_NAME || pres.doctor_name || 'Unknown Doctor'
  const toItemCount = (pres: any) => Number(pres.ITEM_COUNT ?? pres.item_count ?? pres.items?.length ?? 0)
  const toTotalQuantity = (pres: any) => Number(pres.TOTAL_QUANTITY ?? pres.total_quantity ?? 0)
  const toDiagnosis = (pres: any) => pres.DIAGNOSIS || pres.diagnosis || ''
  const toStatus = (pres: any) => pres.STATUS || pres.status || ''
  const toPrescriptionId = (pres: any) => Number(pres.PRESCRIPTION_ID ?? pres.prescription_id ?? 0)

  const isDoctor = user?.role === 'doctor'
  const isPatient = user?.role === 'patient'
  const isPharmacist = user?.role === 'pharmacist'

  const resetForm = () => setForm({
    patient_id: '',
    diagnosis: '',
    notes: '',
    items: [{ medicine_id: '', quantity: '1', dosage: '', duration: '', instructions: '' }],
  })

  const loadPrescriptions = async () => {
    try {
      const res = await prescriptionAPI.getAll()
      setPrescriptions(res.data?.data || [])
    } catch {
      setPrescriptions([])
    }
  }

  const loadPatients = async () => {
    try {
      const res = await patientAPI.getAll()
      setPatients(res.data?.data || [])
    } catch {
      setPatients([])
    }
  }

  const loadMedicines = async () => {
    try {
      const res = await medicineAPI.getAll()
      setMedicines(res.data?.data || [])
    } catch {
      setMedicines([])
    }
  }

  useEffect(() => {
    loadPrescriptions()
  }, [])

  useEffect(() => {
    if (isDoctor) {
      void loadPatients()
      void loadMedicines()
    }
  }, [isDoctor])

  const loadPrescriptionDetail = async (id: number) => {
    if (detailsById[id]) return
    try {
      const res = await prescriptionAPI.getById(id)
      if (res.data?.data) {
        setDetailsById(prev => ({ ...prev, [id]: res.data.data }))
      }
    } catch {}
  }

  const filtered = prescriptions.filter(p => {
    const patientName = toPatientName(p).toLowerCase()
    const doctorName = toDoctorName(p).toLowerCase()
    const diagnosis = toDiagnosis(p).toLowerCase()
    const idText = String(p.PRESCRIPTION_ID ?? p.prescription_id ?? '')
    const term = search.toLowerCase()
    return (
      patientName.includes(term) ||
      doctorName.includes(term) ||
      diagnosis.includes(term) ||
      idText.includes(term)
    )
  })

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { medicine_id: '', quantity: '1', dosage: '', duration: '', instructions: '' }] }))
  const openCreate = () => {
    setEditingPrescription(null)
    resetForm()
    setShowModal(true)
  }

  const openEdit = async (prescription: any) => {
    setError('')
    setEditingPrescription(prescription)
    setShowModal(true)
    const prescriptionId = toPrescriptionId(prescription)
    if (!prescriptionId) {
      setError('Unable to open this prescription for editing.')
      return
    }
    try {
      const res = await prescriptionAPI.getById(prescriptionId)
      const detail = res.data?.data || prescription
      setForm({
        patient_id: String(detail.PATIENT_ID || detail.patient_id || ''),
        diagnosis: detail.DIAGNOSIS || detail.diagnosis || '',
        notes: detail.NOTES || detail.notes || '',
        items: (detail.items || []).length
          ? detail.items.map((item: any) => ({
              medicine_id: String(item.MEDICINE_ID || item.medicine_id || ''),
              quantity: String(item.QUANTITY || item.quantity || 1),
              dosage: item.DOSAGE || item.dosage || '',
              duration: String(item.DURATION_DAYS || item.duration_days || item.duration || ''),
              instructions: item.INSTRUCTIONS || item.instructions || '',
            }))
          : [{ medicine_id: '', quantity: '1', dosage: '', duration: '', instructions: '' }],
      })
    } catch {
      setForm({
        patient_id: String(prescription.PATIENT_ID || prescription.patient_id || ''),
        diagnosis: prescription.DIAGNOSIS || prescription.diagnosis || '',
        notes: prescription.NOTES || prescription.notes || '',
        items: [{ medicine_id: '', quantity: '1', dosage: '', duration: '', instructions: '' }],
      })
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPrescription(null)
    resetForm()
  }

  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, key: string, val: string) => {
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], [key]: val }
      return { ...f, items }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        diagnosis: form.diagnosis || form.notes || 'Prescription',
        items: form.items.map(item => ({
          ...item,
          quantity: Number(item.quantity) || 1,
          medicine_id: Number(item.medicine_id),
        })),
        patient_id: Number(form.patient_id),
      }

      if (editingPrescription) {
        const prescriptionId = toPrescriptionId(editingPrescription)
        if (!prescriptionId) {
          throw new Error('Missing prescription id')
        }
        await prescriptionAPI.update(prescriptionId, payload)
      } else {
        await prescriptionAPI.create(payload)
      }

      await loadPrescriptions()
      closeModal()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save prescription')
    }
    setSaving(false)
  }

  const handleDelete = async (prescription: any) => {
    const prescriptionId = toPrescriptionId(prescription)
    if (!prescriptionId) {
      setError('Unable to delete this prescription.')
      return
    }
    if (!confirm(`Delete prescription #${prescriptionId}?`)) return
    setDeletingId(prescriptionId)
    setError('')
    try {
      await prescriptionAPI.delete(prescriptionId)
      await loadPrescriptions()
      if (expanded === prescriptionId) {
        setExpanded(null)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to delete prescription')
    }
    setDeletingId(null)
  }

  const handleComplete = async (prescription: any) => {
    const prescriptionId = toPrescriptionId(prescription)
    if (!prescriptionId) {
      setError('Unable to complete this prescription.')
      return
    }
    if (!confirm(`Mark prescription #${prescriptionId} as completed?`)) return
    setCompletingId(prescriptionId)
    setError('')
    try {
      await prescriptionAPI.complete(prescriptionId)
      await loadPrescriptions()
      if (expanded === prescriptionId) {
        await loadPrescriptionDetail(prescriptionId)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to complete prescription')
    }
    setCompletingId(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{prescriptions.length} total prescriptions</p>
        </div>
        {isDoctor && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Prescription
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient or doctor..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
      </div>

      <div className="space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {filtered.map((pres, i) => (
          <motion.div
            key={pres.PRESCRIPTION_ID}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => {
                const nextId = expanded === pres.PRESCRIPTION_ID ? null : pres.PRESCRIPTION_ID
                setExpanded(nextId)
                if (nextId) void loadPrescriptionDetail(nextId)
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{toPatientName(pres)}</p>
                    <span className="text-gray-300">·</span>
                    <p className="text-sm text-gray-500">{toDoctorName(pres)}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatDate(toDateValue(pres))}
                    </span>
                    <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      {toItemCount(pres)} medicines
                    </span>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {toTotalQuantity(pres)} total units
                    </span>
                    {toStatus(pres) && (
                      <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{toStatus(pres)}</span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expanded === pres.PRESCRIPTION_ID && 'rotate-180')} />
            </div>

            <AnimatePresence>
              {expanded === pres.PRESCRIPTION_ID && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-0 border-t border-gray-50">
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">Prescription ID:</span> {pres.PRESCRIPTION_ID}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">Issued:</span> {formatDate(detailsById[pres.PRESCRIPTION_ID]?.ISSUED_DATE || pres.ISSUED_DATE || pres.CREATED_AT)}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">Valid Until:</span> {formatDate(detailsById[pres.PRESCRIPTION_ID]?.VALID_UNTIL || pres.VALID_UNTIL || detailsById[pres.PRESCRIPTION_ID]?.CREATED_AT || pres.CREATED_AT)}
                      </div>
                    </div>
                    {(detailsById[pres.PRESCRIPTION_ID]?.DIAGNOSIS || pres.DIAGNOSIS) && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
                        <span className="font-medium">Diagnosis: </span>{detailsById[pres.PRESCRIPTION_ID]?.DIAGNOSIS || pres.DIAGNOSIS}
                      </div>
                    )}
                    {(detailsById[pres.PRESCRIPTION_ID]?.NOTES || pres.NOTES) && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
                        <span className="font-medium">Doctor's Notes: </span>{detailsById[pres.PRESCRIPTION_ID]?.NOTES || pres.NOTES}
                      </div>
                    )}
                    <div className="mt-4 space-y-2">
                      {((detailsById[pres.PRESCRIPTION_ID]?.items) || pres.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Pill className="w-4 h-4 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{item.MEDICINE_NAME}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Qty {item.QUANTITY || 0} · {item.DOSAGE || 'N/A'} · {item.FREQUENCY || 'N/A'} · {item.DURATION || item.DURATION_DAYS || 'N/A'} days
                            </p>
                            {item.INSTRUCTIONS && (
                              <p className="text-xs text-gray-500 mt-1">{item.INSTRUCTIONS}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{item.CATEGORY || 'N/A'}</p>
                            <p className="text-xs font-semibold text-gray-700">LKR {Number(item.UNIT_PRICE || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {isPharmacist && toStatus(pres).toLowerCase() !== 'completed' && (
                      <div className="mt-5 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleComplete(pres)
                          }}
                          disabled={completingId === pres.PRESCRIPTION_ID}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60"
                        >
                          <Pill className="w-3.5 h-3.5" />
                          {completingId === pres.PRESCRIPTION_ID ? 'Completing...' : 'Mark Completed'}
                        </button>
                      </div>
                    )}
                    {isDoctor && (
                      <div className="mt-5 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            void openEdit(pres)
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Prescription
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDelete(pres)
                          }}
                          disabled={deletingId === pres.PRESCRIPTION_ID}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingId === pres.PRESCRIPTION_ID ? 'Deleting...' : 'Delete Prescription'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Create Prescription Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white flex items-center justify-between mb-6 px-8 pt-8 pb-4 border-b border-gray-100 z-40">
                <h2 className="text-xl font-bold text-gray-900">{editingPrescription ? 'Edit Prescription' : 'New Prescription'}</h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 px-8">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Diagnosis</label>
                  <input
                    value={form.diagnosis}
                    onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                    placeholder="Diagnosis or prescription summary"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Patient</label>
                  <select
                    value={form.patient_id}
                    onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                    disabled={!!editingPrescription}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 relative z-10"
                  >
                    <option value="">Select patient</option>
                    {patients.map((p: any) => <option key={p.PATIENT_ID} value={p.PATIENT_ID}>{p.FULL_NAME}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Doctor's notes for the patient..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Medicines</label>
                    <button onClick={addItem} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                      <Plus className="w-3.5 h-3.5" />Add Medicine
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Medicine {idx + 1}</span>
                          {form.items.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <select
                          value={item.medicine_id}
                          onChange={e => updateItem(idx, 'medicine_id', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                        >
                          <option value="">Select medicine</option>
                          {medicines.map((m: any) => <option key={m.MEDICINE_ID} value={m.MEDICINE_ID}>{m.MEDICINE_NAME}</option>)}
                        </select>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { key: 'quantity', placeholder: 'Qty' },
                            { key: 'dosage', placeholder: 'Dosage (e.g. 500mg)' },
                            { key: 'duration', placeholder: 'Duration (e.g. 7 days)' },
                            { key: 'instructions', placeholder: 'Instructions' },
                          ].map(f => (
                            <input
                              key={f.key}
                              value={(item as any)[f.key]}
                              onChange={e => updateItem(idx, f.key, e.target.value)}
                              placeholder={f.placeholder}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-8 py-8 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Prescription'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
