const mongoose = require('mongoose');

// prescription_items → embedded sub-documents (one-to-few, always read together)
const prescriptionItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantity: { type: Number, required: true, min: 1 },
  dosage: { type: String, trim: true },
  frequency: { type: String, trim: true },
  durationDays: { type: Number, min: 1 },
  instructions: { type: String, trim: true, maxlength: 500 },
});

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    diagnosis: { type: String, required: true, trim: true, maxlength: 1000 },
    notes: { type: String, trim: true, maxlength: 1000 },
    issuedDate: { type: Date, default: Date.now },
    validUntil: Date,
    status: { type: String, enum: ['Active', 'Fulfilled', 'Expired', 'Cancelled'], default: 'Active' },
    items: {
      type: [prescriptionItemSchema],
      validate: [(v) => v.length > 0, 'A prescription needs at least one medicine'],
    },
  },
  { timestamps: true }
);
prescriptionSchema.index({ patient: 1, issuedDate: -1 });
prescriptionSchema.index({ doctor: 1 });
prescriptionSchema.index({ 'items.medicine': 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
