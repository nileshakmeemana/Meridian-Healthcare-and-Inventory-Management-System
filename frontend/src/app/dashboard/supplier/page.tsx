'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, Plus, Edit2, Trash2, X, AlertCircle, Package } from 'lucide-react'
import { supplierAPI, medicineAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const orderStatusStyles: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Shipped: 'bg-sky-100 text-sky-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-rose-100 text-rose-700',
}

const orderActivityStyles: Record<string, string> = {
  Active: 'bg-amber-100 text-amber-700',
  Completed: 'bg-slate-100 text-slate-600',
}

export default function SupplierPage() {
  const { user } = useAuthStore()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [medicines, setMedicines] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    user?.role === 'supplier' && user?.profileId ? Number(user.profileId) : null
  )
  const [saving, setSaving] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [orderError, setOrderError] = useState('')
  const isSupplier = user?.role === 'supplier'
  const [form, setForm] = useState({
    full_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  })
  const [orderForm, setOrderForm] = useState({
    supplier_id: '',
    medicine_id: '',
    quantity: '',
    unit_cost: '',
    batch_number: '',
    expiry_date: '',
    notes: '',
  })
  const load = async () => {
    setLoading(true)
    try {
      const [supplierRes, medicineRes, orderRes] = await Promise.all([
        supplierAPI.getAll(),
        medicineAPI.getAll(),
        supplierAPI.getOrders(),
      ])
      
      console.log('Medicine Response:', medicineRes)
      
      const mapped = (supplierRes.data?.data || []).map((row: any) => ({
        SUPPLIER_ID: row.SUPPLIER_ID ?? row.supplier_id,
        FULL_NAME: row.FULL_NAME ?? row.full_name,
        CONTACT_PERSON: row.CONTACT_PERSON ?? row.contact_person,
        PHONE: row.PHONE ?? row.phone,
        ADDRESS: row.ADDRESS ?? row.address,
        RATING: row.RATING ?? row.rating,
        TOTAL_ORDERS: row.TOTAL_ORDERS ?? row.total_orders,
        ACTIVE_ORDERS: row.ACTIVE_ORDERS ?? row.active_orders ?? 0,
        ACTIVE_ORDER_STATUS: row.ACTIVE_ORDER_STATUS ?? row.active_order_status ?? 'Completed',
        EMAIL: row.EMAIL ?? row.email,
        IS_ACTIVE: row.IS_ACTIVE ?? row.is_active,
      }))

      const visibleSuppliers = isSupplier && user?.profileId
        ? mapped.filter((row: any) => Number(row.SUPPLIER_ID) === Number(user.profileId))
        : mapped
      
      const medicinesMapped = (medicineRes.data?.data || medicineRes.data || []).map((row: any) => ({
        MEDICINE_ID: row.MEDICINE_ID ?? row.medicine_id,
        NAME: row.NAME ?? row.name,
        STOCK_QUANTITY: row.STOCK_QUANTITY ?? row.stock_quantity,
        UNIT_PRICE: row.UNIT_PRICE ?? row.unit_price,
      }))

      const ordersMapped = (orderRes.data?.data || []).map((row: any) => ({
        SUPPLY_ID: row.SUPPLY_ID ?? row.supply_id,
        REQUEST_ID: row.REQUEST_ID ?? row.request_id,
        SUPPLIER_ID: row.SUPPLIER_ID ?? row.supplier_id,
        SUPPLIER_NAME: row.SUPPLIER_NAME ?? row.supplier_name,
        MEDICINE_ID: row.MEDICINE_ID ?? row.medicine_id,
        MEDICINE_NAME: row.MEDICINE_NAME ?? row.medicine_name,
        CATEGORY: row.CATEGORY ?? row.category,
        QUANTITY: row.QUANTITY ?? row.quantity,
        UNIT_COST: row.UNIT_COST ?? row.unit_cost,
        TOTAL_COST: row.TOTAL_COST ?? row.total_cost,
        BATCH_NUMBER: row.BATCH_NUMBER ?? row.batch_number,
        EXPIRY_DATE: row.EXPIRY_DATE ?? row.expiry_date,
        SUPPLIED_DATE: row.SUPPLIED_DATE ?? row.supplied_date,
        STATUS: row.STATUS ?? row.status,
        NOTES: row.NOTES ?? row.notes,
      }))
      
      console.log('Medicines Mapped:', medicinesMapped)
      
      setSuppliers(visibleSuppliers)
      setMedicines(medicinesMapped)
      setOrders(ordersMapped)

      if (isSupplier && user?.profileId) {
        setSelectedSupplierId(Number(user.profileId))
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
      setSuppliers([])
      setMedicines([])
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setError('')
    setEditingSupplier(null)
    setForm({
      full_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      password: '',
    })
    setShowModal(true)
  }

  const openEdit = (supplier: any) => {
    setError('')
    setEditingSupplier(supplier)
    setForm({
      full_name: supplier.FULL_NAME || '',
      contact_person: supplier.CONTACT_PERSON || '',
      email: supplier.EMAIL || '',
      phone: supplier.PHONE || '',
      address: supplier.ADDRESS || '',
      password: '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.full_name) {
      setError('Supplier name is required')
      return
    }
    if (!editingSupplier && !form.email) {
      setError('Email is required when creating a new supplier')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editingSupplier) {
        await supplierAPI.update(editingSupplier.SUPPLIER_ID, {
          full_name: form.full_name,
          contact_person: form.contact_person,
          phone: form.phone,
          address: form.address,
        })
      } else {
        const password = form.password || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        await supplierAPI.create({
          email: form.email,
          password,
          full_name: form.full_name,
          contact_person: form.contact_person,
          phone: form.phone,
          address: form.address,
        })
      }
      setShowModal(false)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }

  const deleteSupplier = async (supplier: any) => {
    if (!confirm(`Are you sure you want to delete ${supplier.FULL_NAME}?`)) return
    try {
      const id = Number(supplier.SUPPLIER_ID ?? supplier.supplier_id)
      setDeletingId(id)
      await supplierAPI.delete(id)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete supplier')
    }
    finally {
      setDeletingId(null)
    }
  }

  const openRecordOrder = async () => {
    setOrderError('')
    setOrderForm({
      supplier_id: isSupplier && user?.profileId ? String(user.profileId) : '',
      medicine_id: '',
      quantity: '',
      unit_cost: '',
      batch_number: '',
      expiry_date: '',
      notes: '',
    })
    // Reload medicines when opening modal
    try {
      const medicineRes = await medicineAPI.getAll()
      console.log('Medicines loaded on modal open:', medicineRes)
      const medicinesMapped = (medicineRes.data?.data || medicineRes.data || []).map((row: any) => ({
        MEDICINE_ID: row.MEDICINE_ID ?? row.medicine_id,
        NAME: row.NAME ?? row.name,
        STOCK_QUANTITY: row.STOCK_QUANTITY ?? row.stock_quantity,
        UNIT_PRICE: row.UNIT_PRICE ?? row.unit_price,
      }))
      console.log('Medicines mapped:', medicinesMapped)
      setMedicines(medicinesMapped)
    } catch (err: any) {
      console.error('Error loading medicines:', err)
    }
    setShowOrderModal(true)
  }

  const handleRecordOrder = async () => {
    if (!orderForm.supplier_id) {
      setOrderError('Supplier is required')
      return
    }
    if (!orderForm.medicine_id) {
      setOrderError('Medicine is required')
      return
    }
    if (!orderForm.quantity) {
      setOrderError('Quantity is required')
      return
    }
    setSavingOrder(true)
    setOrderError('')
    try {
      await supplierAPI.createOrderAdmin({
        supplier_id: parseInt(orderForm.supplier_id),
        medicine_id: parseInt(orderForm.medicine_id),
        quantity: parseInt(orderForm.quantity),
        unit_cost: orderForm.unit_cost ? parseFloat(orderForm.unit_cost) : null,
        batch_number: orderForm.batch_number || null,
        expiry_date: orderForm.expiry_date || null,
        notes: orderForm.notes || null,
      })
      setShowOrderModal(false)
      await load()
    } catch (err: any) {
      setOrderError(err?.response?.data?.message || err?.message || 'Failed to record supply order')
    } finally {
      setSavingOrder(false)
    }
  }

  const handleUpdateOrderStatus = async (supplyId: number, newStatus: string) => {
    setUpdatingOrderId(supplyId)
    try {
      const response = await supplierAPI.updateOrderStatus(supplyId, newStatus)
      setOrderError('')
      // Reload orders to reflect the change
      await load()
    } catch (err: any) {
      setOrderError(err?.response?.data?.message || err?.message || 'Failed to update order status')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const filtered = suppliers.filter(s =>
    !search || s.FULL_NAME?.toLowerCase().includes(search.toLowerCase()) ||
    s.EMAIL?.toLowerCase().includes(search.toLowerCase()) ||
    s.PHONE?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedSupplier = suppliers.find(s => Number(s.SUPPLIER_ID) === Number(selectedSupplierId)) || null
  const selectedSupplierOrders = selectedSupplierId
    ? orders.filter(order => Number(order.SUPPLIER_ID) === Number(selectedSupplierId))
    : []

  const stats = [
    { label: 'Total Suppliers', value: suppliers.length, color: 'bg-indigo-50 text-indigo-700', icon: Truck },
    { label: 'Active', value: suppliers.filter(s => s.IS_ACTIVE).length, color: 'bg-emerald-50 text-emerald-700', icon: Truck },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isSupplier ? 'Your supplier profile and related supply orders' : 'Manage medicine suppliers'}
          </p>
        </div>
        {error && (
          <div className="ml-4 px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-sm">
            {error}
          </div>
        )}
        {!isSupplier && (
          <div className="flex gap-2">
            <button
              onClick={openRecordOrder}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              Requets Order
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-gray-100 p-4"
          >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search suppliers by name, email, or phone..."
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No suppliers found</p>
          </div>
        ) : (
          filtered.map((supplier, index) => (
            <motion.div
              key={supplier.SUPPLIER_ID}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => setSelectedSupplierId(Number(supplier.SUPPLIER_ID))}
              className={cn(
                'bg-white rounded-2xl border p-5 transition-shadow cursor-pointer hover:shadow-md',
                Number(selectedSupplierId) === Number(supplier.SUPPLIER_ID)
                  ? 'border-teal-300 shadow-sm ring-2 ring-teal-100'
                  : 'border-gray-100'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-gray-900">{supplier.FULL_NAME}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{supplier.CONTACT_PERSON || 'No contact person'}</p>
                </div>
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', supplier.IS_ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                  {supplier.IS_ACTIVE ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><span className="text-gray-400">Email:</span> {supplier.EMAIL || '—'}</p>
                <p><span className="text-gray-400">Phone:</span> {supplier.PHONE || '—'}</p>
                <p><span className="text-gray-400">Address:</span> {supplier.ADDRESS || '—'}</p>
                {supplier.RATING !== null && <p><span className="text-gray-400">Rating:</span> {supplier.RATING ?? '—'}</p>}
                {supplier.TOTAL_ORDERS !== null && <p><span className="text-gray-400">Total Orders:</span> {supplier.TOTAL_ORDERS ?? 0}</p>}
                <p><span className="text-gray-400">Active Orders:</span> {supplier.ACTIVE_ORDERS ?? 0}</p>
                <div className="pt-1">
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', orderActivityStyles[supplier.ACTIVE_ORDER_STATUS] || 'bg-slate-100 text-slate-600')}>
                    {supplier.ACTIVE_ORDER_STATUS || 'Completed'}
                  </span>
                </div>
              </div>

              {!isSupplier && (
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      openEdit(supplier)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteSupplier(supplier)
                    }}
                    disabled={deletingId === (supplier.SUPPLIER_ID ?? supplier.supplier_id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Supply Orders */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Supply Orders</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isSupplier
                ? 'Orders linked to your supplier profile and their current status'
                : selectedSupplier
                  ? `Orders for ${selectedSupplier.FULL_NAME}`
                  : 'Select a supplier card above to view their order status'}
            </p>
          </div>
          {!isSupplier && selectedSupplier && (
            <button
              onClick={() => setSelectedSupplierId(null)}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              Clear selection
            </button>
          )}
        </div>

        {orderError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 border border-red-200">
            <p className="text-sm text-red-700">{orderError}</p>
          </div>
        )}

        {!selectedSupplierId ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Choose a supplier above to load supply orders and status.
          </div>
        ) : selectedSupplierOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            No supply orders found for this supplier.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Medicine</th>
                    <th className="text-left px-4 py-3 font-medium">Quantity</th>
                    <th className="text-left px-4 py-3 font-medium">Unit Cost</th>
                    <th className="text-left px-4 py-3 font-medium">Order Date</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    {isSupplier && <th className="text-left px-4 py-3 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedSupplierOrders.map(order => (
                    <tr key={order.SUPPLY_ID} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{order.MEDICINE_NAME || 'Medicine'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {order.SUPPLIER_NAME || selectedSupplier?.FULL_NAME || 'Supplier'}
                          {order.BATCH_NUMBER ? ` · Batch ${order.BATCH_NUMBER}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{order.QUANTITY || 0}</td>
                      <td className="px-4 py-4 text-gray-700">${Number(order.UNIT_COST || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 text-gray-700">
                        {order.SUPPLIED_DATE ? new Date(order.SUPPLIED_DATE).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', orderStatusStyles[order.STATUS] || 'bg-gray-100 text-gray-600')}>
                          {order.STATUS || 'Pending'}
                        </span>
                      </td>
                      {isSupplier && (
                        <td className="px-4 py-4">
                          <select
                            value={order.STATUS || 'Pending'}
                            onChange={(e) => handleUpdateOrderStatus(order.SUPPLY_ID, e.target.value)}
                            disabled={updatingOrderId === order.SUPPLY_ID}
                            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {[
                  { key: 'full_name', label: 'Supplier Name', placeholder: 'e.g. ABC Pharmaceuticals' },
                  { key: 'contact_person', label: 'Contact Person', placeholder: 'e.g. John Doe' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'email@supplier.com', readOnly: !!editingSupplier },
                  ...(editingSupplier ? [] : [{ key: 'password', label: 'Password (optional)', type: 'password', placeholder: 'Leave empty for auto-generated' }]),
                  { key: 'phone', label: 'Phone', placeholder: '+94-71-1234567' },
                  { key: 'address', label: 'Address', placeholder: 'Street address' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                    <input
                      type={(field as any).type || 'text'}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={(field as any).placeholder}
                      readOnly={(field as any).readOnly}
                      className={cn(
                        'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400',
                        (field as any).readOnly && 'bg-gray-100 cursor-not-allowed'
                      )}
                    />
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
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Recording Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Record Supply Order</h2>
                <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {orderError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {orderError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Supplier</label>
                  <select
                    value={orderForm.supplier_id}
                    onChange={e => setOrderForm(f => ({ ...f, supplier_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    disabled={isSupplier}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.SUPPLIER_ID} value={s.SUPPLIER_ID}>{s.FULL_NAME}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Medicine {medicines.length > 0 && `(${medicines.length} available)`}
                  </label>
                  {medicines.length === 0 && (
                    <div className="mb-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      No medicines found. Please add medicines first in the Medicines tab.
                    </div>
                  )}
                  <select
                    value={orderForm.medicine_id}
                    onChange={e => setOrderForm(f => ({ ...f, medicine_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    disabled={medicines.length === 0}
                  >
                    <option value="">{medicines.length === 0 ? 'No medicines available' : 'Select medicine'}</option>
                    {medicines.map(m => (
                      <option key={m.MEDICINE_ID} value={m.MEDICINE_ID}>
                        {m.NAME} - Stock: {m.STOCK_QUANTITY || 0} - Price: ${m.UNIT_PRICE || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity</label>
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                      placeholder="e.g. 100"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderForm.unit_cost}
                      onChange={e => setOrderForm(f => ({ ...f, unit_cost: e.target.value }))}
                      placeholder="e.g. 5.00"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Batch Number</label>
                  <input
                    type="text"
                    value={orderForm.batch_number}
                    onChange={e => setOrderForm(f => ({ ...f, batch_number: e.target.value }))}
                    placeholder="e.g. B-12345"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={orderForm.expiry_date}
                    onChange={e => setOrderForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                  <textarea
                    value={orderForm.notes}
                    onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional delivery notes"
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowOrderModal(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleRecordOrder}
                  disabled={savingOrder}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {savingOrder ? 'Recording...' : 'Requets Order'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
