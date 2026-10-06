// Patients, doctors and suppliers directory endpoints
const mongoose = require('mongoose');
const { Patient, Doctor, Supplier, Appointment, Prescription } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, escapeRegex, toDay } = require('../utils/http');
const { queryView } = require('../database/views');
const { fnCountAppointmentsToday } = require('../database/functions');

const nameFilter = (search) => {
  if (!search) return {};
  const rx = new RegExp(escapeRegex(search), 'i');
  return { $or: [{ firstName: rx }, { lastName: rx }, { phone: rx }] };
};

/* ----------------------------- PATIENTS ----------------------------- */

// GET /api/patients — admin & pharmacist: everyone · doctor: only patients they have seen or will see
exports.listPatients = asyncHandler(async (req, res) => {
  const filter = nameFilter(req.query.search);
  if (req.user.role === 'doctor') {
    filter._id = { $in: await Appointment.distinct('patient', { doctor: req.user.profileId }) };
  }
  const patients = await Patient.find(filter).sort({ lastName: 1 }).limit(500)
    .populate('user', 'email isActive').lean({ virtuals: true });

  const lastVisits = await Appointment.aggregate([
    { $match: { patient: { $in: patients.map((p) => p._id) } } },
    { $group: { _id: '$patient', lastVisit: { $max: '$appointmentDate' }, visits: { $sum: 1 } } },
  ]);
  const visitMap = new Map(lastVisits.map((v) => [String(v._id), v]));
  ok(res, patients.map((p) => ({ ...p, lastVisit: visitMap.get(String(p._id))?.lastVisit || null, visits: visitMap.get(String(p._id))?.visits || 0 })));
});

// GET /api/patients/:id — profile + medical history (from vw_patient_medical_history)
exports.getPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'patient' && id !== req.user.profileId) throw ApiError.forbidden();
  if (req.user.role === 'doctor' && !(await Appointment.exists({ patient: id, doctor: req.user.profileId }))) {
    throw ApiError.forbidden('You can only open records of your own patients');
  }
  const patient = await Patient.findById(id).populate('user', 'email username isActive').lean({ virtuals: true });
  if (!patient) throw ApiError.notFound('Patient');

  const history = await queryView(mongoose.connection.db, 'vw_patient_medical_history',
    { patientId: new mongoose.Types.ObjectId(id) }, { sort: { appointmentDate: -1 } });
  const prescriptions = await Prescription.find({ patient: id }).sort({ issuedDate: -1 })
    .populate('doctor', 'firstName lastName specialization').populate('items.medicine', 'name strength dosageForm').lean();
  ok(res, { patient, history, prescriptions });
});

/* ----------------------------- DOCTORS ------------------------------ */

// GET /api/doctors — any signed-in user (patients need it to book)
exports.listDoctors = asyncHandler(async (req, res) => {
  const filter = nameFilter(req.query.search);
  if (req.query.specialization) filter.specialization = req.query.specialization;
  const doctors = await Doctor.find(filter).populate('user', 'isActive email').sort({ lastName: 1 }).lean({ virtuals: true });
  const active = doctors.filter((d) => req.user.role === 'admin' || d.user?.isActive);
  const withToday = await Promise.all(active.map(async (d) => ({ ...d, appointmentsToday: await fnCountAppointmentsToday(d._id) })));
  ok(res, withToday);
});

// GET /api/doctors/:id
exports.getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('user', 'email isActive').lean({ virtuals: true });
  if (!doctor) throw ApiError.notFound('Doctor');
  const [upcoming, completed] = await Promise.all([
    Appointment.countDocuments({ doctor: doctor._id, appointmentDate: { $gte: toDay() }, status: 'Scheduled' }),
    Appointment.countDocuments({ doctor: doctor._id, status: 'Completed' }),
  ]);
  ok(res, { ...doctor, upcoming, completed, appointmentsToday: await fnCountAppointmentsToday(doctor._id) });
});

/* ----------------------------- SUPPLIERS ---------------------------- */

// GET /api/suppliers — with performance metrics from vw_supplier_performance
exports.listSuppliers = asyncHandler(async (_req, res) => {
  const [suppliers, perf] = await Promise.all([
    Supplier.find().populate('user', 'isActive email').sort({ companyName: 1 }).lean(),
    queryView(mongoose.connection.db, 'vw_supplier_performance'),
  ]);
  const perfMap = new Map(perf.map((p) => [String(p._id), p]));
  ok(res, suppliers.map((s) => ({ ...s, performance: perfMap.get(String(s._id)) || null })));
});
