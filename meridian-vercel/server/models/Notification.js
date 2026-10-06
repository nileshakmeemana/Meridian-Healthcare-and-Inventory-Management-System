const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    type: { type: String, enum: ['Info', 'Warning', 'Alert', 'Success', 'Appointment', 'Stock'], default: 'Info' },
    link: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
