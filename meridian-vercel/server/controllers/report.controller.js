// Business Intelligence endpoints — procedures, views and mining algorithms
const mongoose = require('mongoose');
const { Appointment, Sale, StockHistory, Prescription, MedicineRequest, SupplyOrder } = require('../models');
const { asyncHandler, ok, toDay } = require('../utils/http');
const { spGenerateDashboardStats, spGetMostUsedMedicines } = require('../database/procedures');
const { queryView } = require('../database/views');
const { fnGetTotalRevenue, DAY_MS } = require('../database/functions');
const { demandForecast, marketBasket, abcAnalysis } = require('../analytics/mining');

const db = () => mongoose.connection.db;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.dashboardStats = asyncHandler(async (_req, res) => ok(res, await spGenerateDashboardStats()));

exports.mostUsed = asyncHandler(async (req, res) => {
  const { topN = 10, startDate, endDate } = req.query;
  ok(res, await spGetMostUsedMedicines({ topN, startDate, endDate }));
});

exports.mostUsedAllTime = asyncHandler(async (_req, res) => ok(res, await queryView(db(), 'vw_most_used_medicines', {}, { limit: 50 })));
exports.stockReport = asyncHandler(async (_req, res) => ok(res, await queryView(db(), 'vw_medicine_stock_report')));
exports.supplierPerformance = asyncHandler(async (_req, res) => ok(res, await queryView(db(), 'vw_supplier_performance')));

// GET /api/reports/revenue?days=30 — vw_daily_revenue_summary + fn_get_total_revenue
exports.revenue = asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 366);
  const since = new Date(toDay().getTime() - (days - 1) * DAY_MS);
  const rows = await queryView(db(), 'vw_daily_revenue_summary', { saleDay: { $gte: since.toISOString().slice(0, 10) } });
  const byDay = new Map(rows.map((r) => [r.saleDay, r]));
  const series = Array.from({ length: days }, (_, i) => {
    const key = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return byDay.get(key) || { saleDay: key, totalRevenue: 0, totalTransactions: 0, uniquePatients: 0, unitsDispensed: 0, avgTransactionValue: 0 };
  });
  ok(res, { total: await fnGetTotalRevenue(since, new Date()), series });
});

// GET /api/reports/appointments — monthly status breakdown, last 6 months
exports.appointmentStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const rows = await Appointment.aggregate([
    { $match: { appointmentDate: { $gte: since } } },
    { $group: {
        _id: { $dateToString: { date: '$appointmentDate', format: '%Y-%m' } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'No-Show'] }, 1, 0] } },
        scheduled: { $sum: { $cond: [{ $eq: ['$status', 'Scheduled'] }, 1, 0] } },
    } },
    { $sort: { _id: 1 } },
  ]);
  ok(res, rows.map((r) => ({ month: r._id, label: MONTHS[Number(r._id.slice(5)) - 1], ...r, _id: undefined })));
});

// GET /api/reports/daily-patients?days=14
exports.dailyPatients = asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const since = new Date(toDay().getTime() - (days - 1) * DAY_MS);
  const rows = await Appointment.aggregate([
    { $match: { appointmentDate: { $gte: since }, status: { $ne: 'Cancelled' } } },
    { $group: { _id: { $dateToString: { date: '$appointmentDate', format: '%Y-%m-%d' } }, patients: { $addToSet: '$patient' }, visits: { $sum: 1 } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r]));
  ok(res, Array.from({ length: days }, (_, i) => {
    const key = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { day: key, patients: map.get(key)?.patients.length || 0, visits: map.get(key)?.visits || 0 };
  }));
});

// GET /api/reports/consumption?period=monthly|yearly — units dispensed vs units received
exports.consumption = asyncHandler(async (req, res) => {
  const yearly = req.query.period === 'yearly';
  const now = new Date();
  const buckets = yearly
    ? Array.from({ length: 5 }, (_, i) => String(now.getUTCFullYear() - 4 + i))
    : Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6 + i, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  const since = yearly ? new Date(Date.UTC(Number(buckets[0]), 0, 1)) : new Date(`${buckets[0]}-01T00:00:00Z`);
  const fmt = yearly ? '%Y' : '%Y-%m';

  const [dispensed, intake] = await Promise.all([
    Sale.aggregate([
      { $match: { saleDate: { $gte: since } } }, { $unwind: '$items' },
      { $group: { _id: { $dateToString: { date: '$saleDate', format: fmt } }, units: { $sum: '$items.quantity' } } },
    ]),
    StockHistory.aggregate([
      { $match: { changedAt: { $gte: since }, quantityChange: { $gt: 0 }, changeType: { $in: ['Supply', 'Add'] } } },
      { $group: { _id: { $dateToString: { date: '$changedAt', format: fmt } }, units: { $sum: '$quantityChange' } } },
    ]),
  ]);
  const d = new Map(dispensed.map((r) => [r._id, r.units]));
  const n = new Map(intake.map((r) => [r._id, r.units]));
  const series = buckets.map((b) => ({
    key: b, label: yearly ? b : `${MONTHS[Number(b.slice(5)) - 1]}`, cycle: yearly ? b : `${MONTHS[Number(b.slice(5)) - 1]} ${b.slice(0, 4)}`,
    dispensed: d.get(b) || 0, intake: n.get(b) || 0,
  }));
  ok(res, { period: yearly ? 'yearly' : 'monthly', total: series.reduce((s, r) => s + r.dispensed, 0), series });
});

exports.forecast = asyncHandler(async (req, res) => ok(res, await demandForecast({ months: Number(req.query.months) || 6, limit: Number(req.query.limit) || 15 })));
exports.basket = asyncHandler(async (req, res) => ok(res, await marketBasket({
  minSupport: Number(req.query.minSupport) || 0.02, minConfidence: Number(req.query.minConfidence) || 0.2,
})));
exports.abc = asyncHandler(async (req, res) => ok(res, await abcAnalysis({ days: Number(req.query.days) || 180 })));

/* ------------------------- Role-specific home ------------------------- */
// GET /api/reports/home — compact summary for doctor / patient / supplier dashboards
exports.home = asyncHandler(async (req, res) => {
  const { role, profileId, id } = req.user;
  const today = toDay();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  if (role === 'doctor') {
    const [todayCount, completedToday, upcoming, patients, openRequests, prescriptionsMonth] = await Promise.all([
      Appointment.countDocuments({ doctor: profileId, appointmentDate: { $gte: today, $lt: tomorrow }, status: { $ne: 'Cancelled' } }),
      Appointment.countDocuments({ doctor: profileId, appointmentDate: { $gte: today, $lt: tomorrow }, status: 'Completed' }),
      Appointment.countDocuments({ doctor: profileId, appointmentDate: { $gte: tomorrow }, status: 'Scheduled' }),
      Appointment.distinct('patient', { doctor: profileId }).then((a) => a.length),
      MedicineRequest.countDocuments({ requestedBy: id, status: 'Pending' }),
      Prescription.countDocuments({ doctor: profileId, issuedDate: { $gte: monthStart } }),
    ]);
    return ok(res, { todayCount, completedToday, upcoming, patients, openRequests, prescriptionsMonth });
  }
  if (role === 'patient') {
    const [upcoming, past, activeRx, totalRx] = await Promise.all([
      Appointment.countDocuments({ patient: profileId, appointmentDate: { $gte: today }, status: 'Scheduled' }),
      Appointment.countDocuments({ patient: profileId, status: 'Completed' }),
      Prescription.countDocuments({ patient: profileId, status: 'Active' }),
      Prescription.countDocuments({ patient: profileId }),
    ]);
    return ok(res, { upcoming, past, activeRx, totalRx });
  }
  if (role === 'supplier') {
    const [openRequests, inTransit, deliveredMonth, value] = await Promise.all([
      MedicineRequest.countDocuments({ requestType: 'External', status: 'Pending', $or: [{ supplier: profileId }, { supplier: null }, { supplier: { $exists: false } }] }),
      SupplyOrder.countDocuments({ supplier: profileId, status: { $in: ['Pending', 'Shipped'] } }),
      SupplyOrder.countDocuments({ supplier: profileId, status: 'Delivered', updatedAt: { $gte: monthStart } }),
      SupplyOrder.aggregate([{ $match: { supplier: new mongoose.Types.ObjectId(profileId), status: 'Delivered' } }, { $group: { _id: null, v: { $sum: '$totalCost' }, u: { $sum: '$quantity' } } }]),
    ]);
    return ok(res, { openRequests, inTransit, deliveredMonth, deliveredValue: value[0]?.v || 0, deliveredUnits: value[0]?.u || 0 });
  }
  return ok(res, await spGenerateDashboardStats());
});
