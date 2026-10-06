const mongoose = require('mongoose');

// sale_items → embedded sub-documents; unitPrice is captured at time of sale (historical price)
const saleItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
});

const saleSchema = new mongoose.Schema(
  {
    pharmacist: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    department: { type: String, default: 'Outpatient Pharmacy', trim: true },
    items: { type: [saleItemSchema], validate: [(v) => v.length > 0, 'A sale needs at least one item'] },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Insurance', 'Online'], default: 'Cash' },
    saleDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);
saleSchema.index({ saleDate: -1 });
saleSchema.index({ 'items.medicine': 1 });

module.exports = mongoose.model('Sale', saleSchema);
