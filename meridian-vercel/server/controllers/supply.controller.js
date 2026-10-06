// Medicine requests (doctor → pharmacy, pharmacy → supplier) and supply orders
const { MedicineRequest, SupplyOrder, Notification, Supplier, Medicine } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/http');
const { notifyRole } = require('../database/triggers');

const populateRequest = (q) => q
  .populate('requestedBy', 'username role').populate('respondedBy', 'username role')
  .populate('medicine', 'name sku stockQuantity reorderLevel unit').populate('supplier', 'companyName');

const populateOrder = (q) => q
  .populate('supplier', 'companyName contactPerson').populate('medicine', 'name sku unit stockQuantity')
  .populate('receivedBy', 'username').populate('request', 'priority reason');

/* ----------------------------- REQUESTS ----------------------------- */

// GET /api/requests?status=&type=
exports.listRequests = asyncHandler(async (req, res) => {
  const { role, id, profileId } = req.user;
  const filter = {};
  if (role === 'doctor') filter.requestedBy = id;
  if (role === 'supplier') {
    filter.requestType = 'External';
    filter.$or = [{ supplier: profileId }, { supplier: { $exists: false } }, { supplier: null }];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type && role !== 'supplier') filter.requestType = req.query.type;
  ok(res, await populateRequest(MedicineRequest.find(filter).sort({ createdAt: -1 }).limit(300)).lean());
});

// POST /api/requests — doctor asks the pharmacy (Internal); pharmacist asks suppliers (External)
exports.createRequest = asyncHandler(async (req, res) => {
  const { medicineId, medicineName, quantityRequested, priority, reason, supplierId } = req.body;
  const requestType = req.user.role === 'doctor' ? 'Internal' : 'External';
  const [request] = await MedicineRequest.create([{
    requestedBy: req.user.id, requestType, medicine: medicineId || undefined, medicineName,
    quantityRequested, priority, reason, supplier: requestType === 'External' ? supplierId || undefined : undefined,
  }]);

  const med = medicineId ? await Medicine.findById(medicineId).select('name').lean() : null;
  const label = med?.name || medicineName;
  if (requestType === 'Internal') {
    await notifyRole('pharmacist', { type: 'Alert', title: 'Medicine requested by a doctor',
      message: `${quantityRequested} × ${label} (${priority || 'Normal'} priority).`, link: '/dashboard/requests' });
  } else if (supplierId) {
    const s = await Supplier.findById(supplierId).lean();
    if (s) await Notification.create({ user: s.user, type: 'Alert', title: 'New restock request', message: `${quantityRequested} × ${label}.`, link: '/dashboard/requests' });
  } else {
    await notifyRole('supplier', { type: 'Alert', title: 'New restock request', message: `${quantityRequested} × ${label}.`, link: '/dashboard/requests' });
  }
  ok(res, await populateRequest(MedicineRequest.findById(request._id)).lean(), 'Request sent', 201);
});

// PATCH /api/requests/:id/respond  { decision: 'Approved'|'Rejected'|'Fulfilled', notes }
exports.respond = asyncHandler(async (req, res) => {
  const { decision, notes } = req.body;
  if (!['Approved', 'Rejected', 'Fulfilled'].includes(decision)) throw ApiError.badRequest('Choose approve, reject or fulfil');
  const request = await MedicineRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request');
  if (request.status === 'Fulfilled' || request.status === 'Rejected') throw ApiError.badRequest(`This request is already ${request.status.toLowerCase()}`);

  const { role, profileId, id } = req.user;
  if (request.requestType === 'Internal' && !['pharmacist', 'admin'].includes(role)) throw ApiError.forbidden();
  if (request.requestType === 'External') {
    if (!['supplier', 'admin'].includes(role)) throw ApiError.forbidden();
    if (role === 'supplier' && request.supplier && String(request.supplier) !== profileId) throw ApiError.forbidden();
    if (role === 'supplier' && decision === 'Approved') request.supplier = profileId;
  }
  request.status = decision;
  request.respondedBy = id;
  request.responseNotes = notes;
  await request.save();

  await Notification.create({ user: request.requestedBy, type: decision === 'Rejected' ? 'Warning' : 'Success',
    title: `Request ${decision.toLowerCase()}`, message: notes || `Your request for ${request.quantityRequested} units was ${decision.toLowerCase()}.`,
    link: '/dashboard/requests' });
  ok(res, await populateRequest(MedicineRequest.findById(request._id)).lean(), `Request ${decision.toLowerCase()}`);
});

/* --------------------------- SUPPLY ORDERS -------------------------- */

// GET /api/supply-orders?status=
exports.listOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'supplier') filter.supplier = req.user.profileId;
  if (req.query.status) filter.status = req.query.status;
  ok(res, await populateOrder(SupplyOrder.find(filter).sort({ suppliedDate: -1 }).limit(300)).lean());
});

// POST /api/supply-orders — supplier dispatches medicines
exports.createOrder = asyncHandler(async (req, res) => {
  const { requestId, medicineId, quantity, unitCost, batchNumber, expiryDate, notes } = req.body;
  if (requestId) {
    const r = await MedicineRequest.findById(requestId);
    if (!r || r.requestType !== 'External') throw ApiError.badRequest('That request cannot be supplied');
    if (r.supplier && String(r.supplier) !== req.user.profileId) throw ApiError.forbidden('This request is assigned to another supplier');
    if (r.status === 'Pending') { r.status = 'Approved'; r.supplier = req.user.profileId; r.respondedBy = req.user.id; await r.save(); }
  }
  const order = new SupplyOrder({ request: requestId || undefined, supplier: req.user.profileId, medicine: medicineId,
    quantity, unitCost, batchNumber, expiryDate, notes, status: 'Shipped' });
  await order.save();
  await notifyRole('pharmacist', { type: 'Info', title: 'Delivery on the way', message: `${quantity} units dispatched. Confirm receipt when it arrives.`, link: '/dashboard/supply-orders' });
  ok(res, await populateOrder(SupplyOrder.findById(order._id)).lean(), 'Supply dispatched', 201);
});

// PATCH /api/supply-orders/:id/status { status } — 'Delivered' fires trg_supply_update_stock
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await SupplyOrder.findById(req.params.id).lean();
  if (!order) throw ApiError.notFound('Supply order');
  if (order.status === 'Delivered' || order.status === 'Cancelled') throw ApiError.badRequest(`Order is already ${order.status.toLowerCase()}`);

  const { role, profileId, id } = req.user;
  if (role === 'supplier') {
    if (String(order.supplier) !== profileId) throw ApiError.forbidden();
    if (!['Shipped', 'Cancelled'].includes(status)) throw ApiError.forbidden('Only the hospital can confirm delivery');
  } else if (!['Delivered', 'Cancelled'].includes(status)) {
    throw ApiError.badRequest('Choose delivered or cancelled');
  }

  const set = { status };
  if (status === 'Delivered') set.receivedBy = id;
  const updated = await SupplyOrder.findOneAndUpdate({ _id: order._id }, { $set: set }, { new: true, actor: id });
  ok(res, await populateOrder(SupplyOrder.findById(updated._id)).lean(),
    status === 'Delivered' ? `Delivery confirmed — ${order.quantity} units added to stock` : `Order ${status.toLowerCase()}`);
});
