const mongoose = require('mongoose');
const { Appointment, Patient, Doctor } = require('../models');
const { TIME_SLOTS, STATUSES } = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, toDay, paginate } = require('../utils/http');
const { spBookAppointment } = require('../database/procedures');
const { queryView } = require('../database/views');
const { Notification } = require('../models');
const { DAY_MS } = require('../database/functions');

const populate = (q) => q
  .populate('patient', 'firstName lastName phone dateOfBirth bloodGroup gender')
  .populate('doctor', 'firstName lastName specialization room consultationFee');

// Row-level security: each role only sees its own appointments
function scope(user) {
  if (user.role === 'doctor') return { doctor: user.profileId };
  if (user.role === 'patient') return { patient: user.profileId };
  return {};
}

async function loadOwned(req) {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw ApiError.notFound('Appointment');
  const s = scope(req.user);
  if (s.doctor && String(appt.doctor) !== s.doctor) throw ApiError.forbidden();
  if (s.patient && String(appt.patient) !== s.patient) throw ApiError.forbidden();
  return appt;
}

// GET /api/appointments?status=&from=&to=&doctorId=&patientId=
exports.list = asyncHandler(async (req, res) => {
  const { status, from, to, doctorId, patientId, upcoming } = req.query;
  const filter = scope(req.user);
  if (req.user.role === 'admin') {
    if (doctorId) filter.doctor = doctorId;
    if (patientId) filter.patient = patientId;
  }
  if (status && STATUSES.includes(status)) filter.status = status;
  if (from || to || upcoming) {
    filter.appointmentDate = {};
    if (from) filter.appointmentDate.$gte = toDay(from);
    if (to) filter.appointmentDate.$lt = new Date(toDay(to).getTime() + DAY_MS);
    if (upcoming) filter.appointmentDate.$gte = toDay();
  }
  const { limit, skip, page } = paginate(req.query);
  const sort = upcoming ? { appointmentDate: 1, appointmentTime: 1 } : { appointmentDate: -1, appointmentTime: 1 };
  const [rows, total] = await Promise.all([
    populate(Appointment.find(filter).sort(sort).skip(skip).limit(limit)).lean({ virtuals: true }),
    Appointment.countDocuments(filter),
  ]);
  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/appointments/today — reads vw_doctor_schedule_today
exports.today = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'doctor' ? { doctorId: new mongoose.Types.ObjectId(req.user.profileId) } : {};
  ok(res, await queryView(mongoose.connection.db, 'vw_doctor_schedule_today', filter));
});

// GET /api/appointments/availability?doctorId=&date=YYYY-MM-DD
exports.availability = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) throw ApiError.badRequest('doctorId and date are required');
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) throw ApiError.notFound('Doctor');
  const day = toDay(date);
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const works = !doctor.availableDays?.length || doctor.availableDays.includes(weekday);
  const booked = new Set(await Appointment.distinct('appointmentTime', { doctor: doctorId, appointmentDate: day, status: { $ne: 'Cancelled' } }));
  ok(res, { worksThatDay: works, availableDays: doctor.availableDays, slots: TIME_SLOTS.map((t) => ({ time: t, available: works && !booked.has(t) })) });
});

// POST /api/appointments — sp_book_appointment
exports.book = asyncHandler(async (req, res) => {
  const { doctorId, date, time, reason } = req.body;
  const patientId = req.user.role === 'patient' ? req.user.profileId : req.body.patientId;
  if (!patientId) throw ApiError.badRequest('Choose a patient');
  const appt = await spBookAppointment({ patientId, doctorId, date, time, reason });
  ok(res, await populate(Appointment.findById(appt._id)).lean(), 'Appointment booked', 201);
});

// PATCH /api/appointments/:id/status  { status, notes }
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  if (!STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
  const appt = await loadOwned(req);
  if (req.user.role === 'patient' && status !== 'Cancelled') throw ApiError.forbidden('Patients can only cancel appointments');
  if (appt.status === 'Completed' && status !== 'Completed') throw ApiError.badRequest('Completed appointments cannot be changed');
  appt.status = status;
  if (notes !== undefined) appt.notes = notes;
  if (status === 'Completed') appt.completedAt = new Date();
  appt.$locals.auditActor = req.user.id;
  await appt.save();

  if (status === 'Cancelled') {
    const [patient, doctor] = await Promise.all([Patient.findById(appt.patient).lean(), Doctor.findById(appt.doctor).lean()]);
    const target = req.user.role === 'patient' ? doctor?.user : patient?.user;
    if (target) {
      await Notification.create({ user: target, type: 'Warning', title: 'Appointment cancelled',
        message: `The appointment on ${appt.appointmentDate.toISOString().slice(0, 10)} at ${appt.appointmentTime} was cancelled.`, link: '/dashboard/appointments' });
    }
  }
  ok(res, await populate(Appointment.findById(appt._id)).lean(), `Appointment marked ${status.toLowerCase()}`);
});

// PATCH /api/appointments/:id/notes  { notes } — doctor diagnosis notes
exports.saveNotes = asyncHandler(async (req, res) => {
  const appt = await loadOwned(req);
  appt.notes = req.body.notes || '';
  appt.$locals.auditActor = req.user.id;
  await appt.save();
  ok(res, appt, 'Notes saved');
});

