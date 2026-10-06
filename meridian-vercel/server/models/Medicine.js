const mongoose = require('mongoose');
const { medicineTriggers, auditPlugin } = require('../database/triggers');
const { fnGetMedicineStockStatus, fnDaysUntilExpiry } = require('../database/functions');

const CATEGORIES = [
  'Antibiotics', 'Analgesics', 'Cardiovascular', 'Antidiabetic', 'Gastrointestinal', 'Respiratory',
  'Antihistamine', 'Vitamins', 'Anaesthetics', 'Surgical Supplies', 'Diagnostics', 'Dermatology',
];

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    genericName: { type: String, trim: true, maxlength: 100 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    manufacturer: { type: String, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'Tablets', trim: true },
    stockQuantity: { type: Number, required: true, default: 0, min: [0, 'Stock cannot go below zero'] },
    reorderLevel: { type: Number, required: true, default: 10, min: 0 },
    batchNumber: { type: String, trim: true, uppercase: true },
    expiryDate: Date,
    dosageForm: { type: String, trim: true },
    strength: { type: String, trim: true },
    requiresPrescription: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

medicineSchema.virtual('stockStatus').get(function stockStatus() { return fnGetMedicineStockStatus(this); });
medicineSchema.virtual('daysUntilExpiry').get(function daysUntilExpiry() { return fnDaysUntilExpiry(this); });
medicineSchema.virtual('stockValue').get(function stockValue() { return this.stockQuantity * this.unitPrice; });

medicineSchema.index({ name: 'text', genericName: 'text', sku: 'text' });
medicineSchema.index({ category: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ stockQuantity: 1 });

medicineTriggers(medicineSchema);
medicineSchema.plugin(auditPlugin, { collectionName: 'medicines' });

module.exports = mongoose.model('Medicine', medicineSchema);
module.exports.CATEGORIES = CATEGORIES;
