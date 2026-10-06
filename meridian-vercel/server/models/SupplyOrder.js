const mongoose = require('mongoose');
const { supplyOrderTriggers } = require('../database/triggers');

const supplyOrderSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineRequest' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    batchNumber: { type: String, trim: true, uppercase: true },
    expiryDate: Date,
    suppliedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Shipped' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);
supplyOrderSchema.index({ supplier: 1, suppliedDate: -1 });
supplyOrderTriggers(supplyOrderSchema);

module.exports = mongoose.model('SupplyOrder', supplyOrderSchema);
