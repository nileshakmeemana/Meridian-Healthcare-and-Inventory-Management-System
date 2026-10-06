// ============================================================
// MERIDIAN — User-Defined Functions (MongoDB edition)
// Oracle PL/SQL FUNCTION  →  pure JS function + aggregation expression
// ============================================================
const mongoose = require('mongoose');

const DAY_MS = 24 * 60 * 60 * 1000;

/** fn_get_patient_age — age in whole years from date of birth */
function fnGetPatientAge(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

/** fn_is_medicine_expired — 1 expired, 0 valid, -1 no expiry set */
function fnIsMedicineExpired(medicine, now = new Date()) {
  if (!medicine?.expiryDate) return -1;
  return new Date(medicine.expiryDate) < now ? 1 : 0;
}

/** days until expiry (negative when already expired) */
function fnDaysUntilExpiry(medicine, now = new Date()) {
  if (!medicine?.expiryDate) return null;
  return Math.floor((new Date(medicine.expiryDate) - now) / DAY_MS);
}

/** fn_get_medicine_stock_status — Expired | Critical | Low | Normal */
function fnGetMedicineStockStatus(medicine, now = new Date()) {
  if (!medicine) return 'Unknown';
  if (fnIsMedicineExpired(medicine, now) === 1) return 'Expired';
  if (medicine.stockQuantity === 0) return 'Critical';
  if (medicine.stockQuantity <= medicine.reorderLevel) return 'Low';
  return 'Normal';
}

/**
 * The same stock-status rule as an aggregation expression, so views and
 * pipelines compute it inside the database exactly like the Oracle function.
 */
const stockStatusExpr = {
  $switch: {
    branches: [
      { case: { $and: [{ $ne: ['$expiryDate', null] }, { $lt: ['$expiryDate', '$$NOW'] }] }, then: 'Expired' },
      { case: { $eq: ['$stockQuantity', 0] }, then: 'Critical' },
      { case: { $lte: ['$stockQuantity', '$reorderLevel'] }, then: 'Low' },
    ],
    default: 'Normal',
  },
};

/** fn_count_appointments_today — non-cancelled appointments for a doctor today */
async function fnCountAppointmentsToday(doctorId) {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);
  return mongoose.model('Appointment').countDocuments({
    doctor: doctorId,
    appointmentDate: { $gte: start, $lt: end },
    status: { $ne: 'Cancelled' },
  });
}

/** fn_get_total_revenue — sum of sales between two dates (inclusive) */
async function fnGetTotalRevenue(startDate, endDate) {
  const [row] = await mongoose.model('Sale').aggregate([
    { $match: { saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  return row?.total || 0;
}

module.exports = {
  fnGetPatientAge,
  fnIsMedicineExpired,
  fnDaysUntilExpiry,
  fnGetMedicineStockStatus,
  fnCountAppointmentsToday,
  fnGetTotalRevenue,
  stockStatusExpr,
  DAY_MS,
};
