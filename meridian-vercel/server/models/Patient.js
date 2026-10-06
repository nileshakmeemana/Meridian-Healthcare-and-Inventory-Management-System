const mongoose = require('mongoose');
const { fnGetPatientAge } = require('../database/functions');

const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null], default: null },
    phone: { type: String, trim: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 255 },
    emergencyContact: { type: String, trim: true, maxlength: 100 },
    emergencyPhone: { type: String, trim: true, maxlength: 20 },
    allergies: { type: String, trim: true, maxlength: 255 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

patientSchema.virtual('fullName').get(function fullName() { return `${this.firstName} ${this.lastName}`; });
patientSchema.virtual('age').get(function age() { return fnGetPatientAge(this.dateOfBirth); });
patientSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model('Patient', patientSchema);
