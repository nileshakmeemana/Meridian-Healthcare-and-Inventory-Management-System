const mongoose = require('mongoose');
const { appointmentTriggers, auditPlugin } = require('../database/triggers');

const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'No-Show'];
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
];

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentDate: { type: Date, required: true },          // stored at 00:00 UTC
    appointmentTime: { type: String, required: true, enum: TIME_SLOTS },
    status: { type: String, enum: STATUSES, default: 'Scheduled' },
    reason: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 2000 },      // doctor's diagnosis notes
    completedAt: Date,
  },
  { timestamps: true }
);

appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ status: 1 });

appointmentTriggers(appointmentSchema);
appointmentSchema.plugin(auditPlugin, { collectionName: 'appointments' });

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.STATUSES = STATUSES;
module.exports.TIME_SLOTS = TIME_SLOTS;
