const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changeType: { type: String, enum: ['Add', 'Remove', 'Sale', 'Supply', 'Adjust'], required: true },
    quantityBefore: { type: Number, required: true },
    quantityChange: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: 'changedAt', updatedAt: false } }
);
stockHistorySchema.index({ medicine: 1, changedAt: -1 });

module.exports = mongoose.model('StockHistory', stockHistorySchema);
