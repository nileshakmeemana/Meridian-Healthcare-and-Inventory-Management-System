// ============================================================
// MERIDIAN — Stored Procedures (MongoDB edition)
// Oracle PL/SQL PROCEDURE  →  async function wrapped in a
// multi-document transaction (COMMIT on success, ROLLBACK on throw).
// Validation errors throw ApiError so the API returns a clean 4xx.
// ============================================================
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { toDay } = require('../utils/http');
const { runInTransaction } = require('./transaction');
const { fnGetMedicineStockStatus, DAY_MS } = require('./functions');

const M = (name) => mongoose.model(name);

/* ------------------------------------------------------------------
 * PROCEDURE 1: sp_book_appointment
 * Validates doctor/patient, date, working day and slot conflicts, then inserts.
 * (trg_appointment_notification fires on insert.)
 * ------------------------------------------------------------------ */
async function spBookAppointment({ patientId, doctorId, date, time, reason }) {
  return runInTransaction(async (session) => {
    const doctor = await M('Doctor').findById(doctorId).populate('user', 'isActive').session(session);
    if (!doctor || !doctor.user?.isActive) throw ApiError.badRequest('Doctor not found or inactive');

    const patient = await M('Patient').findById(patientId).session(session);
    if (!patient) throw ApiError.badRequest('Patient not found');

    const day = toDay(date);
    if (day < toDay()) throw ApiError.badRequest('Appointment date cannot be in the past');

    const weekday = day.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    if (doctor.availableDays?.length && !doctor.availableDays.includes(weekday)) {
      throw ApiError.badRequest(`Dr. ${doctor.lastName} does not consult on ${weekday}`);
    }

    const conflict = await M('Appointment').exists({
      doctor: doctorId, appointmentDate: day, appointmentTime: time, status: { $ne: 'Cancelled' },
    }).session(session);
    if (conflict) throw ApiError.conflict('That time slot is already booked for this doctor');

    const [appointment] = await M('Appointment').create(
      [{ patient: patientId, doctor: doctorId, appointmentDate: day, appointmentTime: time, reason, status: 'Scheduled' }],
      { session }
    );
    return appointment;
  });
}

/* ------------------------------------------------------------------
 * PROCEDURE 2: sp_issue_medicine
 * Pre-checks stock for every line, records the sale, decrements stock
 * atomically (conditional $inc = SELECT … FOR UPDATE), fulfils the prescription.
 * ------------------------------------------------------------------ */
async function spIssueMedicine({ pharmacistId, patientId, prescriptionId, items, paymentMethod = 'Cash',
  department, notes, actorUserId, saleDate }) {
  if (!Array.isArray(items) || items.length === 0) throw ApiError.badRequest('Add at least one medicine to the sale');

  return runInTransaction(async (session) => {
    const ids = items.map((i) => i.medicineId);
    const medicines = await M('Medicine').find({ _id: { $in: ids } }).session(session);
    const byId = new Map(medicines.map((m) => [String(m._id), m]));

    // Pass 1 — validate everything before touching stock
    const lines = items.map(({ medicineId, quantity }) => {
      const qty = Number(quantity);
      const med = byId.get(String(medicineId));
      if (!med) throw ApiError.badRequest(`Medicine ${medicineId} not found`);
      if (!Number.isInteger(qty) || qty < 1) throw ApiError.badRequest(`Quantity for ${med.name} must be a whole number above 0`);
      if (fnGetMedicineStockStatus(med) === 'Expired') throw ApiError.badRequest(`${med.name} has expired and cannot be issued`);
      if (med.stockQuantity < qty) {
        throw ApiError.badRequest(`Not enough ${med.name}: ${med.stockQuantity} in stock, ${qty} requested`);
      }
      return { medicine: med._id, quantity: qty, unitPrice: med.unitPrice, subtotal: +(med.unitPrice * qty).toFixed(2) };
    });
    const totalAmount = +lines.reduce((s, l) => s + l.subtotal, 0).toFixed(2);

    const [sale] = await M('Sale').create([{
      pharmacist: pharmacistId, patient: patientId || undefined, prescription: prescriptionId || undefined,
      items: lines, totalAmount, paymentMethod, department, notes, saleDate: saleDate || new Date(),
    }], { session });

    // Pass 2 — decrement stock; the filter guarantees we never go negative
    for (const line of lines) {
      const updated = await M('Medicine').findOneAndUpdate(
        { _id: line.medicine, stockQuantity: { $gte: line.quantity } },
        { $inc: { stockQuantity: -line.quantity } },
        { new: true, session, actor: actorUserId, changeType: 'Sale', reason: `Sale ${String(sale._id).slice(-6).toUpperCase()}` }
      );
      if (!updated) throw ApiError.conflict('Stock changed while the sale was being recorded. Please try again.');
    }

    if (prescriptionId) {
      await M('Prescription').updateOne({ _id: prescriptionId, status: 'Active' }, { $set: { status: 'Fulfilled' } }, { session });
    }
    return sale;
  });
}

/* ------------------------------------------------------------------
 * PROCEDURE 3: sp_add_medicine_stock (extended to signed adjustments)
 * Positive quantity adds stock, negative removes (damaged, returned…).
 * ------------------------------------------------------------------ */
async function spAdjustMedicineStock({ medicineId, quantity, actorUserId, reason, changeType }) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty === 0) throw ApiError.badRequest('Quantity must be a non-zero whole number');

  return runInTransaction(async (session) => {
    const filter = { _id: medicineId };
    if (qty < 0) filter.stockQuantity = { $gte: -qty };
    const updated = await M('Medicine').findOneAndUpdate(
      filter,
      { $inc: { stockQuantity: qty } },
      { new: true, session, actor: actorUserId, changeType: changeType || (qty > 0 ? 'Add' : 'Remove'),
        reason: reason || (qty > 0 ? 'Manual stock addition' : 'Manual stock removal') }
    );
    if (!updated) {
      const exists = await M('Medicine').exists({ _id: medicineId }).session(session);
      throw exists ? ApiError.badRequest('Cannot remove more units than are in stock') : ApiError.notFound('Medicine');
    }
    return updated;
  });
}

/* ------------------------------------------------------------------
 * PROCEDURE 4: sp_get_most_used_medicines (BI)
 * Top-N medicines by units dispensed in a date window, with RANK().
 * ------------------------------------------------------------------ */
async function spGetMostUsedMedicines({ topN = 10, startDate, endDate } = {}) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * DAY_MS);
  end.setUTCHours(23, 59, 59, 999);

  return M('Sale').aggregate([
    { $match: { saleDate: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    { $group: {
        _id: '$items.medicine',
        totalUnitsSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        patients: { $addToSet: '$patient' },
        transactions: { $sum: 1 },
        avgQty: { $avg: '$items.quantity' },
    } },
    { $setWindowFields: { sortBy: { totalUnitsSold: -1 }, output: { rankPosition: { $rank: {} } } } },
    { $limit: Number(topN) },
    { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'm' } },
    { $unwind: '$m' },
    { $project: {
        _id: 0, medicineId: '$_id', rankPosition: 1, medicineName: '$m.name', category: '$m.category',
        unitPrice: '$m.unitPrice', stockQuantity: '$m.stockQuantity', reorderLevel: '$m.reorderLevel',
        totalUnitsSold: 1, totalRevenue: { $round: ['$totalRevenue', 2] },
        uniquePatients: { $size: '$patients' }, numberOfTransactions: '$transactions',
        avgQtyPerTransaction: { $round: ['$avgQty', 2] },
    } },
  ]);
}

/* ------------------------------------------------------------------
 * PROCEDURE 5: sp_create_prescription
 * Completes the appointment and writes the prescription in one transaction.
 * ------------------------------------------------------------------ */
async function spCreatePrescription({ appointmentId, doctorId, diagnosis, notes, validDays = 30, items }) {
  if (!diagnosis?.trim()) throw ApiError.badRequest('Diagnosis is required');
  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('Add at least one medicine');

  return runInTransaction(async (session) => {
    const appt = await M('Appointment').findById(appointmentId).session(session);
    if (!appt) throw ApiError.notFound('Appointment');
    if (doctorId && String(appt.doctor) !== String(doctorId)) throw ApiError.forbidden('This appointment belongs to another doctor');
    if (appt.status === 'Cancelled') throw ApiError.badRequest('Cannot prescribe for a cancelled appointment');
    if (await M('Prescription').exists({ appointment: appt._id }).session(session)) {
      throw ApiError.conflict('A prescription already exists for this appointment');
    }

    const medIds = items.map((i) => i.medicineId);
    const found = await M('Medicine').countDocuments({ _id: { $in: medIds } }).session(session);
    if (found !== new Set(medIds.map(String)).size) throw ApiError.badRequest('One or more medicines do not exist');

    appt.status = 'Completed';
    appt.completedAt = new Date();
    if (notes) appt.notes = notes;
    await appt.save({ session });

    const [rx] = await M('Prescription').create([{
      appointment: appt._id, patient: appt.patient, doctor: appt.doctor, diagnosis, notes,
      issuedDate: new Date(), validUntil: new Date(Date.now() + validDays * DAY_MS), status: 'Active',
      items: items.map((i) => ({
        medicine: i.medicineId, quantity: Number(i.quantity), dosage: i.dosage,
        frequency: i.frequency, durationDays: i.durationDays ? Number(i.durationDays) : undefined, instructions: i.instructions,
      })),
    }], { session });

    const patient = await M('Patient').findById(appt.patient).session(session).lean();
    if (patient) {
      await M('Notification').create([{
        user: patient.user, type: 'Info', title: 'New prescription',
        message: `Your prescription for "${diagnosis}" is ready to collect at the pharmacy.`, link: '/dashboard/prescriptions',
      }], { session });
    }
    return rx;
  });
}

/* ------------------------------------------------------------------
 * PROCEDURE 6: sp_generate_dashboard_stats
 * One round trip for the admin overview (Promise.all ≈ scalar subqueries).
 * ------------------------------------------------------------------ */
async function spGenerateDashboardStats() {
  const start = toDay();
  const end = new Date(start.getTime() + DAY_MS);
  const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  const activeCount = async (model) => {
    const [r] = await M(model).aggregate([
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
      { $match: { 'u.isActive': true } }, { $count: 'n' },
    ]);
    return r?.n || 0;
  };
  const revenue = async (from, to) => {
    const [r] = await M('Sale').aggregate([
      { $match: { saleDate: { $gte: from, $lt: to } } },
      { $group: { _id: null, t: { $sum: '$totalAmount' }, units: { $sum: { $sum: '$items.quantity' } } } },
    ]);
    return { total: r?.t || 0, units: r?.units || 0 };
  };

  const [patients, doctors, pharmacists, suppliers, medicines, stockAgg, lowStock, expired, todayAppts,
    completedToday, todayRev, monthRev, pendingRequests] = await Promise.all([
    activeCount('Patient'), activeCount('Doctor'), activeCount('Pharmacist'), activeCount('Supplier'),
    M('Medicine').countDocuments(),
    M('Medicine').aggregate([{ $group: { _id: null, units: { $sum: '$stockQuantity' }, value: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } } } }]),
    M('Medicine').countDocuments({ $expr: { $lte: ['$stockQuantity', '$reorderLevel'] } }),
    M('Medicine').countDocuments({ expiryDate: { $lt: new Date() } }),
    M('Appointment').countDocuments({ appointmentDate: { $gte: start, $lt: end } }),
    M('Appointment').countDocuments({ appointmentDate: { $gte: start, $lt: end }, status: 'Completed' }),
    revenue(start, end), revenue(monthStart, end),
    M('MedicineRequest').countDocuments({ status: 'Pending' }),
  ]);

  return {
    totalActivePatients: patients, totalActiveDoctors: doctors, totalPharmacists: pharmacists, totalSuppliers: suppliers,
    totalMedicines: medicines, stockUnits: stockAgg[0]?.units || 0, stockValue: +(stockAgg[0]?.value || 0).toFixed(2),
    lowStockCount: lowStock, expiredCount: expired,
    todayAppointments: todayAppts, completedToday,
    todayRevenue: todayRev.total, monthRevenue: monthRev.total, monthUnitsDispensed: monthRev.units,
    pendingRequests,
  };
}

module.exports = {
  spBookAppointment, spIssueMedicine, spAdjustMedicineStock,
  spGetMostUsedMedicines, spCreatePrescription, spGenerateDashboardStats,
};
