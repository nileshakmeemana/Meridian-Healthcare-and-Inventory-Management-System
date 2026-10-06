const { Sale } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, paginate, toDay } = require('../utils/http');
const { spIssueMedicine } = require('../database/procedures');
const { DAY_MS } = require('../database/functions');

const populate = (q) => q
  .populate('patient', 'firstName lastName')
  .populate('pharmacist', 'firstName lastName')
  .populate('items.medicine', 'name sku unit');

// GET /api/sales?from=&to=
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.saleDate = {};
    if (req.query.from) filter.saleDate.$gte = toDay(req.query.from);
    if (req.query.to) filter.saleDate.$lt = new Date(toDay(req.query.to).getTime() + DAY_MS);
  }
  const { page, limit, skip } = paginate(req.query);
  const [rows, total] = await Promise.all([
    populate(Sale.find(filter).sort({ saleDate: -1 }).skip(skip).limit(limit)).lean(),
    Sale.countDocuments(filter),
  ]);
  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// POST /api/sales — sp_issue_medicine
exports.create = asyncHandler(async (req, res) => {
  if (!req.user.profileId) throw ApiError.forbidden('Only pharmacists can record sales');
  const { patientId, prescriptionId, items, paymentMethod, department, notes } = req.body;
  const sale = await spIssueMedicine({
    pharmacistId: req.user.profileId, patientId, prescriptionId, items, paymentMethod, department, notes, actorUserId: req.user.id,
  });
  ok(res, await populate(Sale.findById(sale._id)).lean(), `Sale recorded · Rs. ${sale.totalAmount.toLocaleString()}`, 201);
});
