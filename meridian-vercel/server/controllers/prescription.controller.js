const { Prescription } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok } = require('../utils/http');
const { spCreatePrescription } = require('../database/procedures');

const populate = (q) => q
  .populate('patient', 'firstName lastName phone dateOfBirth')
  .populate('doctor', 'firstName lastName specialization')
  .populate('items.medicine', 'name strength dosageForm unitPrice stockQuantity');

// GET /api/prescriptions?status=
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'patient') filter.patient = req.user.profileId;
  if (req.user.role === 'doctor') filter.doctor = req.user.profileId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.patientId && req.user.role !== 'patient') filter.patient = req.query.patientId;
  ok(res, await populate(Prescription.find(filter).sort({ issuedDate: -1 }).limit(300)).lean());
});

// GET /api/prescriptions/:id
exports.get = asyncHandler(async (req, res) => {
  const rx = await populate(Prescription.findById(req.params.id)).lean();
  if (!rx) throw ApiError.notFound('Prescription');
  if (req.user.role === 'patient' && String(rx.patient._id) !== req.user.profileId) throw ApiError.forbidden();
  if (req.user.role === 'doctor' && String(rx.doctor._id) !== req.user.profileId) throw ApiError.forbidden();
  ok(res, rx);
});

// POST /api/prescriptions — sp_create_prescription (also completes the appointment)
exports.create = asyncHandler(async (req, res) => {
  const { appointmentId, diagnosis, notes, validDays, items } = req.body;
  const rx = await spCreatePrescription({ appointmentId, doctorId: req.user.profileId, diagnosis, notes, validDays, items });
  ok(res, await populate(Prescription.findById(rx._id)).lean(), 'Prescription issued and appointment completed', 201);
});
