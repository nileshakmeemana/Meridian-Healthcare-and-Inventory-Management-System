const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, trim: true },
    experienceYears: { type: Number, default: 0, min: 0, max: 70 },
    availableDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    consultationFee: { type: Number, default: 0, min: 0 },
    room: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
doctorSchema.virtual('fullName').get(function fullName() { return `Dr. ${this.firstName} ${this.lastName}`; });
doctorSchema.index({ specialization: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
