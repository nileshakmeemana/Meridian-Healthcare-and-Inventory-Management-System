const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    licenseNumber: { type: String, trim: true, unique: true, sparse: true },
    rating: { type: Number, default: 5, min: 0, max: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
