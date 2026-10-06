const mongoose = require('mongoose');

const pharmacistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, trim: true },
    shift: { type: String, enum: ['Morning', 'Afternoon', 'Night'], default: 'Morning' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
pharmacistSchema.virtual('fullName').get(function fullName() { return `${this.firstName} ${this.lastName}`; });

module.exports = mongoose.model('Pharmacist', pharmacistSchema);
