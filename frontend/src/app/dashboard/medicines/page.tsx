'use client';
// src/app/dashboard/medicines/page.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, AlertTriangle, Package, RefreshCw, X } from 'lucide-react';
import { medicineAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const statusColors: Record<string, string> = {
  Normal:   'bg-emerald-100 text-emerald-700',
  Low:      'bg-amber-100  text-amber-700',
  Critical: 'bg-rose-100   text-rose-700',
  Expired:  'bg-gray-100   text-gray-600',
};

export default function MedicinesPage() {
  const user = useAuthStore((s) => s.user);
  const canEdit = ['admin', 'pharmacist'].includes(user?.role || '');

  const [medicines, setMedicines] = useState<any[]>([]);
  const [search,   setSearch]    = useState('');
  const [loading,  setLoading]   = useState(true);
  const [showAdd,  setShowAdd]   = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    category: '',
    manufacturer: '',
    unit_price: '',
    stock_quantity: '',
    reorder_level: '',
    expiry_date: '',
    dosage_form: '',
    strength: '',
    requires_prescription: false,
    description: '',
  });
  const [stockForm, setStockForm] = useState({
    quantity_change: '1',
    change_type: 'Add',
    reason: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await medicineAPI.getAll({ search, limit: 50 });
      setMedicines(res.data.data || []);
    } catch {
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const openAdd = () => {
    setError('');
    setSelectedMedicine(null);
    setForm({
      name: '',
      generic_name: '',
      category: '',
      manufacturer: '',
      unit_price: '',
      stock_quantity: '',
      reorder_level: '',
      expiry_date: '',
      dosage_form: '',
      strength: '',
      requires_prescription: false,
      description: '',
    });
    setShowAdd(true);
  };

  const openEdit = (med: any) => {
    setError('');
    setSelectedMedicine(med);
    setForm({
      name: med.NAME || '',
      generic_name: med.GENERIC_NAME || '',
      category: med.CATEGORY || '',
      manufacturer: med.MANUFACTURER || '',
      unit_price: med.UNIT_PRICE?.toString?.() || '',
      stock_quantity: med.STOCK_QUANTITY?.toString?.() || '',
      reorder_level: med.REORDER_LEVEL?.toString?.() || '',
      expiry_date: med.EXPIRY_DATE ? new Date(med.EXPIRY_DATE).toISOString().slice(0, 10) : '',
      dosage_form: med.DOSAGE_FORM || '',
      strength: med.STRENGTH || '',
      requires_prescription: !!med.REQUIRES_PRESCRIPTION,
      description: med.DESCRIPTION || '',
    });
    setShowEdit(true);
  };

  const openStock = (med: any) => {
    setError('');
    setSelectedMedicine(med);
    setStockForm({
      quantity_change: '1',
      change_type: 'Add',
      reason: '',
    });
    setShowStock(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await medicineAPI.create({
        ...form,
        unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity || 0),
        reorder_level: Number(form.reorder_level || 10),
        requires_prescription: form.requires_prescription ? 1 : 0,
      });
      setShowAdd(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedMedicine) return;
    setSaving(true);
    setError('');
    try {
      await medicineAPI.update(selectedMedicine.MEDICINE_ID, {
        ...form,
        unit_price: Number(form.unit_price || 0),
        reorder_level: Number(form.reorder_level || 10),
        requires_prescription: form.requires_prescription ? 1 : 0,
      });
      setShowEdit(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!selectedMedicine) return;
    setSaving(true);
    setError('');
    try {
      const quantity = Math.abs(Number(stockForm.quantity_change || 0));
      const signedQuantity = stockForm.change_type === 'Remove' ? -quantity : quantity;
      await medicineAPI.updateStock(selectedMedicine.MEDICINE_ID, {
        quantity_change: signedQuantity,
        change_type: stockForm.change_type,
        reason: stockForm.reason,
      });
      setShowStock(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const filtered = medicines.filter(m =>
    !search || m.NAME.toLowerCase().includes(search.toLowerCase()) || m.GENERIC_NAME?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medicines</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage medicine inventory</p>
        </div>
        {canEdit && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAdd}
            className="flex items-center gap-2 bg-meridian-500 hover:bg-meridian-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add Medicine</h2>
                  <p className="text-sm text-gray-500">Create a new inventory item in the database</p>
                </div>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Medicine Name', type: 'text', placeholder: 'Amoxiclav 625mg' },
                  { key: 'generic_name', label: 'Generic Name', type: 'text', placeholder: 'Amoxicillin/Clavulanate' },
                  { key: 'category', label: 'Category', type: 'text', placeholder: 'Antibiotics' },
                  { key: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'GSK Lanka' },
                  { key: 'unit_price', label: 'Unit Price', type: 'number', placeholder: '320.00' },
                  { key: 'stock_quantity', label: 'Stock Quantity', type: 'number', placeholder: '150' },
                  { key: 'reorder_level', label: 'Reorder Level', type: 'number', placeholder: '20' },
                  { key: 'expiry_date', label: 'Expiry Date', type: 'date', placeholder: '' },
                  { key: 'dosage_form', label: 'Dosage Form', type: 'text', placeholder: 'Tablet' },
                  { key: 'strength', label: 'Strength', type: 'text', placeholder: '625mg' },
                ].map(field => (
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

                <label className="flex items-center gap-2 md:col-span-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.requires_prescription}
                    onChange={e => setForm(f => ({ ...f, requires_prescription: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  Requires prescription
                </label>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Optional product notes"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create Medicine'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Medicine</h2>
                  <p className="text-sm text-gray-500">Update medicine details</p>
                </div>
                <button onClick={() => setShowEdit(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Medicine Name', type: 'text' },
                  { key: 'generic_name', label: 'Generic Name', type: 'text' },
                  { key: 'category', label: 'Category', type: 'text' },
                  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
                  { key: 'unit_price', label: 'Unit Price', type: 'number' },
                  { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
                  { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
                  { key: 'dosage_form', label: 'Dosage Form', type: 'text' },
                  { key: 'strength', label: 'Strength', type: 'text' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                    />
                  </div>
                ))}

                <label className="flex items-center gap-2 md:col-span-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.requires_prescription}
                    onChange={e => setForm(f => ({ ...f, requires_prescription: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  Requires prescription
                </label>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStock && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowStock(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Update Stock</h2>
                  <p className="text-sm text-gray-500">Adjust inventory for {selectedMedicine?.NAME}</p>
                </div>
                <button onClick={() => setShowStock(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Change Type</label>
                  <select
                    value={stockForm.change_type}
                    onChange={e => setStockForm(f => ({ ...f, change_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  >
                    <option value="Add">Add</option>
                    <option value="Remove">Remove</option>
                    <option value="Adjust">Adjust</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity Change</label>
                  <input
                    type="number"
                    value={stockForm.quantity_change}
                    onChange={e => setStockForm(f => ({ ...f, quantity_change: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason</label>
                  <textarea
                    value={stockForm.reason}
                    onChange={e => setStockForm(f => ({ ...f, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowStock(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleStockUpdate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: medicines.length, icon: Package, color: 'text-blue-500' },
          { label: 'Low Stock', value: medicines.filter(m => m.STOCK_STATUS === 'Low' || m.STOCK_STATUS === 'Critical').length, icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Expired', value: medicines.filter(m => m.STOCK_STATUS === 'Expired').length, icon: RefreshCw, color: 'text-rose-500' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or generic name..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full meridian-table">
            <thead>
              <tr>
                <th className="text-left">Medicine</th>
                <th className="text-left">Category</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Reorder Level</th>
                <th className="text-right">Price (Rs.)</th>
                <th className="text-left">Expiry</th>
                <th className="text-left">Status</th>
                {canEdit && <th className="text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(canEdit ? 8 : 7)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((med) => (
                <motion.tr
                  key={med.MEDICINE_ID}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td>
                    <p className="font-medium text-foreground">{med.NAME}</p>
                    <p className="text-xs text-muted-foreground">{med.GENERIC_NAME}</p>
                  </td>
                  <td>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{med.CATEGORY}</span>
                  </td>
                  <td className="text-right font-semibold">
                    <span className={med.STOCK_QUANTITY <= med.REORDER_LEVEL ? 'text-rose-500' : 'text-foreground'}>
                      {med.STOCK_QUANTITY}
                    </span>
                  </td>
                  <td className="text-right text-muted-foreground">{med.REORDER_LEVEL}</td>
                  <td className="text-right">{Number(med.UNIT_PRICE).toFixed(2)}</td>
                  <td>
                    {med.EXPIRY_DATE ? new Date(med.EXPIRY_DATE).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'2-digit' }) : '—'}
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[med.STOCK_STATUS] || statusColors.Normal}`}>
                      {med.STOCK_STATUS}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="text-center">
                      <button onClick={() => openEdit(med)} className="text-xs text-meridian-600 hover:underline mr-2">Edit</button>
                      <button onClick={() => openStock(med)} className="text-xs text-blue-500 hover:underline">+ Stock</button>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
