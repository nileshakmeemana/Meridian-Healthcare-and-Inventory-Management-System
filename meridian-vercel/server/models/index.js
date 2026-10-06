// Load every model once so mongoose.model('X') lookups in triggers always resolve
module.exports = {
  User: require('./User'),
  Patient: require('./Patient'),
  Doctor: require('./Doctor'),
  Pharmacist: require('./Pharmacist'),
  Supplier: require('./Supplier'),
  Medicine: require('./Medicine'),
  Appointment: require('./Appointment'),
  Prescription: require('./Prescription'),
  MedicineRequest: require('./MedicineRequest'),
  SupplyOrder: require('./SupplyOrder'),
  Sale: require('./Sale'),
  StockHistory: require('./StockHistory'),
  Notification: require('./Notification'),
  AuditLog: require('./AuditLog'),
};
