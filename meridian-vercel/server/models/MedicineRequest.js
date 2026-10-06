const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestType: { type: String, enum: ['Internal', 'External'], default: 'Internal' }, // Internal → pharmacy, External → supplier
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String, trim: true },                // free text when the medicine is not stocked yet
    quantityRequested: { type: Number, required: true, min: 1 },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    reason: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Fulfilled'], default: 'Pending' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responseNotes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);
requestSchema.pre('validate', function needsMedicine() {
  if (!this.medicine && !this.medicineName) this.invalidate('medicine', 'Choose a medicine or type its name');
});
requestSchema.index({ status: 1, requestType: 1 });

module.exports = mongoose.model('MedicineRequest', requestSchema);
