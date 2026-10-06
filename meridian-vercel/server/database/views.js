// ============================================================
// MERIDIAN — Database Views (MongoDB edition)
// Oracle CREATE VIEW  →  MongoDB read-only view (db.createView)
// Each view is a stored aggregation pipeline evaluated on read,
// so it is always up to date, exactly like an Oracle view.
// Requires MongoDB 5.0+ ($dateTrunc, $dateDiff, $setWindowFields).
// ============================================================
const { stockStatusExpr } = require('./functions');

const today = { $dateTrunc: { date: '$$NOW', unit: 'day' } };
const fullName = (path) => ({ $concat: [`$${path}.firstName`, ' ', `$${path}.lastName`] });
const ageOf = (path) => ({ $dateDiff: { startDate: `$${path}`, endDate: '$$NOW', unit: 'year' } });

const VIEWS = [
  /* VIEW 1 — today's schedule for every doctor */
  {
    name: 'vw_doctor_schedule_today',
    viewOn: 'appointments',
    pipeline: [
      { $match: { $expr: { $eq: [{ $dateTrunc: { date: '$appointmentDate', unit: 'day' } }, today] } } },
      { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'd' } },
      { $lookup: { from: 'patients', localField: 'patient', foreignField: '_id', as: 'p' } },
      { $lookup: { from: 'prescriptions', localField: '_id', foreignField: 'appointment', as: 'rx' } },
      { $unwind: '$d' }, { $unwind: '$p' },
      { $project: {
          appointmentDate: 1, appointmentTime: 1, status: 1, reason: 1, notes: 1,
          doctorId: '$d._id', doctorName: fullName('d'), specialization: '$d.specialization',
          patientId: '$p._id', patientName: fullName('p'), patientAge: ageOf('p.dateOfBirth'),
          bloodGroup: '$p.bloodGroup', patientPhone: '$p.phone',
          hasPrescription: { $gt: [{ $size: '$rx' }, 0] },
      } },
      { $sort: { appointmentTime: 1 } },
    ],
  },

  /* VIEW 2 — inventory with computed status, value and 30-day usage */
  {
    name: 'vw_medicine_stock_report',
    viewOn: 'medicines',
    pipeline: [
      { $lookup: {
          from: 'sales', let: { mid: '$_id' },
          pipeline: [
            { $match: { $expr: { $gte: ['$saleDate', { $dateSubtract: { startDate: '$$NOW', unit: 'day', amount: 30 } }] } } },
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.medicine', '$$mid'] } } },
            { $group: { _id: null, qty: { $sum: '$items.quantity' } } },
          ],
          as: 'usage',
      } },
      { $addFields: {
          stockStatus: stockStatusExpr,
          daysUntilExpiry: { $cond: [{ $ifNull: ['$expiryDate', false] }, { $dateDiff: { startDate: '$$NOW', endDate: '$expiryDate', unit: 'day' } }, null] },
          stockValue: { $multiply: ['$stockQuantity', '$unitPrice'] },
          soldLast30Days: { $ifNull: [{ $first: '$usage.qty' }, 0] },
      } },
      { $project: { usage: 0, __v: 0 } },
      { $addFields: { _statusOrder: { $indexOfArray: [['Critical', 'Expired', 'Low', 'Normal'], '$stockStatus'] } } },
      { $sort: { _statusOrder: 1, name: 1 } },
      { $project: { _statusOrder: 0 } },
    ],
  },

  /* VIEW 3 — full patient history: appointment + doctor + prescription */
  {
    name: 'vw_patient_medical_history',
    viewOn: 'appointments',
    pipeline: [
      { $lookup: { from: 'patients', localField: 'patient', foreignField: '_id', as: 'p' } },
      { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'd' } },
      { $lookup: { from: 'prescriptions', localField: '_id', foreignField: 'appointment', as: 'rx' } },
      { $unwind: '$p' }, { $unwind: '$d' },
      { $unwind: { path: '$rx', preserveNullAndEmptyArrays: true } },
      { $project: {
          patientId: '$p._id', patientName: fullName('p'), age: ageOf('p.dateOfBirth'),
          bloodGroup: '$p.bloodGroup', gender: '$p.gender',
          appointmentId: '$_id', appointmentDate: 1, appointmentTime: 1, appointmentStatus: '$status', reason: 1, notes: 1,
          doctorName: fullName('d'), specialization: '$d.specialization',
          prescriptionId: '$rx._id', diagnosis: '$rx.diagnosis', issuedDate: '$rx.issuedDate',
          prescriptionStatus: '$rx.status', medicinesPrescribed: { $size: { $ifNull: ['$rx.items', []] } },
      } },
      { $sort: { patientId: 1, appointmentDate: -1 } },
    ],
  },

  /* VIEW 4 — BI: most used medicines, ranked (the "wow factor") */
  {
    name: 'vw_most_used_medicines',
    viewOn: 'sales',
    pipeline: [
      { $unwind: '$items' },
      { $group: {
          _id: '$items.medicine',
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          patients: { $addToSet: '$patient' },
          transactions: { $sum: 1 },
          avgQtyPerSale: { $avg: '$items.quantity' },
      } },
      { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'm' } },
      { $unwind: '$m' },
      { $setWindowFields: { sortBy: { totalUnitsSold: -1 }, output: { usageRank: { $rank: {} } } } },
      { $project: {
          medicineId: '$_id', _id: 0, usageRank: 1, medicineName: '$m.name', category: '$m.category',
          dosageForm: '$m.dosageForm', unitPrice: '$m.unitPrice', stockQuantity: '$m.stockQuantity',
          totalUnitsSold: 1, totalRevenue: { $round: ['$totalRevenue', 2] },
          distinctPatients: { $size: '$patients' }, transactions: 1, avgQtyPerSale: { $round: ['$avgQtyPerSale', 2] },
      } },
      { $sort: { usageRank: 1 } },
    ],
  },

  /* VIEW 5 — supplier reliability */
  {
    name: 'vw_supplier_performance',
    viewOn: 'suppliers',
    pipeline: [
      { $lookup: { from: 'supplyorders', localField: '_id', foreignField: 'supplier', as: 'o' } },
      { $project: {
          companyName: 1, contactPerson: 1, phone: 1, rating: 1,
          totalOrders: { $size: '$o' },
          totalUnitsSupplied: { $sum: '$o.quantity' },
          totalValueSupplied: { $round: [{ $sum: '$o.totalCost' }, 2] },
          deliveredOrders: { $size: { $filter: { input: '$o', cond: { $eq: ['$$this.status', 'Delivered'] } } } },
          cancelledOrders: { $size: { $filter: { input: '$o', cond: { $eq: ['$$this.status', 'Cancelled'] } } } },
          lastSupplyDate: { $max: '$o.suppliedDate' },
      } },
      { $addFields: {
          deliveryRatePct: { $cond: [{ $gt: ['$totalOrders', 0] },
            { $round: [{ $multiply: [{ $divide: ['$deliveredOrders', '$totalOrders'] }, 100] }, 1] }, null] },
      } },
      { $sort: { totalUnitsSupplied: -1 } },
    ],
  },

  /* VIEW 6 — daily revenue summary */
  {
    name: 'vw_daily_revenue_summary',
    viewOn: 'sales',
    pipeline: [
      { $group: {
          _id: { $dateToString: { date: '$saleDate', format: '%Y-%m-%d' } },
          totalTransactions: { $sum: 1 },
          patients: { $addToSet: '$patient' },
          totalRevenue: { $sum: '$totalAmount' },
          avgTransactionValue: { $avg: '$totalAmount' },
          unitsDispensed: { $sum: { $sum: '$items.quantity' } },
      } },
      { $project: {
          _id: 0, saleDay: '$_id', totalTransactions: 1, unitsDispensed: 1,
          uniquePatients: { $size: '$patients' },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgTransactionValue: { $round: ['$avgTransactionValue', 2] },
      } },
      { $sort: { saleDay: -1 } },
    ],
  },
];

/** (Re)create every view — run with `npm run views` or automatically by the seeder */
async function createViews(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const v of VIEWS) {
    if (existing.has(v.name)) await db.dropCollection(v.name);
    await db.createCollection(v.name, { viewOn: v.viewOn, pipeline: v.pipeline });
  }
  return VIEWS.map((v) => v.name);
}

/** Read from a view like a table: SELECT * FROM vw_x WHERE ... */
function queryView(db, name, filter = {}, { limit = 500, sort } = {}) {
  let cursor = db.collection(name).find(filter);
  if (sort) cursor = cursor.sort(sort);
  return cursor.limit(limit).toArray();
}

module.exports = { VIEWS, createViews, queryView };
