const mongoose = require('mongoose');
const { Medicine, StockHistory, Sale, Prescription } = require('../models');
const { CATEGORIES } = require('../models/Medicine');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, escapeRegex, paginate } = require('../utils/http');
const { spAdjustMedicineStock } = require('../database/procedures');
const { queryView } = require('../database/views');

const FIELDS = ['name', 'genericName', 'sku', 'category', 'manufacturer', 'unitPrice', 'unit', 'reorderLevel',
  'batchNumber', 'expiryDate', 'dosageForm', 'strength', 'requiresPrescription', 'description'];
const pickFields = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined && body[f] !== '').map((f) => [f, body[f]]));

// GET /api/medicines?search=&category=&status=&page=&limit=   (reads vw_medicine_stock_report)
exports.list = asyncHandler(async (req, res) => {
  const { search, category, status } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { genericName: rx }, { sku: rx }, { batchNumber: rx }];
  }
  if (category) filter.category = category;
  if (status) filter.stockStatus = { $in: String(status).split(',') };
  const { page, limit, skip } = paginate(req.query);
  const coll = mongoose.connection.db.collection('vw_medicine_stock_report');
  const [rows, total] = await Promise.all([
    coll.find(filter).skip(skip).limit(limit).toArray(),
    coll.countDocuments(filter),
  ]);
  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/medicines/alerts — low / critical stock and expiring within 60 days
exports.alerts = asyncHandler(async (_req, res) => {
  ok(res, await queryView(mongoose.connection.db, 'vw_medicine_stock_report', {
    $or: [{ stockStatus: { $in: ['Low', 'Critical', 'Expired'] } }, { daysUntilExpiry: { $lte: 60 } }],
  }));
});

// GET /api/medicines/categories — category list with stock totals
exports.categories = asyncHandler(async (_req, res) => {
  const totals = await Medicine.aggregate([
    { $group: {
        _id: '$category', items: { $sum: 1 }, units: { $sum: '$stockQuantity' },
        value: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } },
        low: { $sum: { $cond: [{ $lte: ['$stockQuantity', '$reorderLevel'] }, 1, 0] } },
    } },
  ]);
  const map = new Map(totals.map((t) => [t._id, t]));
  ok(res, CATEGORIES.map((c) => ({ category: c, items: map.get(c)?.items || 0, units: map.get(c)?.units || 0,
    value: +(map.get(c)?.value || 0).toFixed(2), low: map.get(c)?.low || 0 })));
});

// GET /api/medicines/:id
exports.get = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id).lean({ virtuals: true });
  if (!med) throw ApiError.notFound('Medicine');
  ok(res, med);
});

// GET /api/medicines/:id/history — stock_history written by the trigger
exports.history = asyncHandler(async (req, res) => {
  ok(res, await StockHistory.find({ medicine: req.params.id }).sort({ changedAt: -1 }).limit(100)
    .populate('changedBy', 'username role').lean());
});

// GET /api/medicines/movements — latest stock movements across all medicines
exports.movements = asyncHandler(async (req, res) => {
  const { limit } = paginate({ limit: req.query.limit || 20 });
  ok(res, await StockHistory.find().sort({ changedAt: -1 }).limit(limit)
    .populate('medicine', 'name sku category unit batchNumber expiryDate stockQuantity reorderLevel')
    .populate('changedBy', 'username role').lean());
});

// POST /api/medicines
exports.create = asyncHandler(async (req, res) => {
  const med = new Medicine({ ...pickFields(req.body), stockQuantity: Number(req.body.stockQuantity) || 0 });
  med.$locals.auditActor = req.user.id;
  await med.save();
  ok(res, med.toObject({ virtuals: true }), 'Medicine added', 201);
});

// PUT /api/medicines/:id — details only; stock changes go through /stock
exports.update = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id);
  if (!med) throw ApiError.notFound('Medicine');
  Object.assign(med, pickFields(req.body));
  med.$locals.auditActor = req.user.id;
  await med.save();
  ok(res, med.toObject({ virtuals: true }), 'Medicine updated');
});

// PATCH /api/medicines/:id/stock  { quantity (+/-), reason } — sp_adjust_medicine_stock
exports.adjustStock = asyncHandler(async (req, res) => {
  const med = await spAdjustMedicineStock({
    medicineId: req.params.id, quantity: req.body.quantity, reason: req.body.reason,
    changeType: req.body.changeType, actorUserId: req.user.id,
  });
  ok(res, med.toObject({ virtuals: true }), `Stock is now ${med.stockQuantity}`);
});

// DELETE /api/medicines/:id — only if never sold or prescribed
exports.remove = asyncHandler(async (req, res) => {
  const used = await Promise.all([Sale.exists({ 'items.medicine': req.params.id }), Prescription.exists({ 'items.medicine': req.params.id })]);
  if (used.some(Boolean)) throw ApiError.conflict('This medicine has sales or prescriptions. Set its stock to zero instead of deleting it.');
  const deleted = await Medicine.findOneAndDelete({ _id: req.params.id }, { actor: req.user.id });
  if (!deleted) throw ApiError.notFound('Medicine');
  await StockHistory.deleteMany({ medicine: deleted._id });
  ok(res, null, 'Medicine deleted');
});
