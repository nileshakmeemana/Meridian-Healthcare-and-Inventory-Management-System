// controllers/appointment.controller.js
const { query, getConnection } = require("../config/database");

const resolveDoctorId = async (userId) => {
  const result = await query(
    `SELECT doctor_id FROM doctors WHERE user_id = :1`,
    [userId],
  );
  return result.rows[0]?.DOCTOR_ID || null;
};

const resolveAppointment = async (appointmentId) => {
  const result = await query(
    `SELECT appointment_id, doctor_id, patient_id, status
     FROM appointments
     WHERE appointment_id = :1`,
    [appointmentId],
  );
  return result.rows[0] || null;
};

// GET appointments (role-scoped)
exports.getAppointments = async (req, res) => {
  try {
    let sql = `
      SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.reason, a.notes,
             p.patient_id, p.first_name || ' ' || p.last_name AS patient_name,
             d.doctor_id, d.first_name || ' ' || d.last_name AS doctor_name, d.specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d  ON a.doctor_id  = d.doctor_id
      WHERE 1=1`;
    const binds = [];

    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (doctorId) {
        sql += ` AND a.doctor_id = :${binds.length + 1}`;
        binds.push(doctorId);
      }
    } else if (req.user.role === "patient") {
      const pt = await query(
        `SELECT patient_id FROM patients WHERE user_id = :1`,
        [req.user.userId],
      );
      if (pt.rows[0]) {
        sql += ` AND a.patient_id = :${binds.length + 1}`;
        binds.push(pt.rows[0].PATIENT_ID);
      }
    }

    if (req.query.status) {
      sql += ` AND a.status = :${binds.length + 1}`;
      binds.push(req.query.status);
    }
    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time`;

    const result = await query(sql, binds);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET today's appointments
exports.getTodayAppointments = async (req, res) => {
  try {
    let sql = `
      SELECT a.appointment_id, a.appointment_time, a.status, a.reason,
             p.first_name || ' ' || p.last_name AS patient_name,
             d.first_name || ' ' || d.last_name AS doctor_name, d.specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d  ON a.doctor_id  = d.doctor_id
      WHERE TRUNC(a.appointment_date) = TRUNC(SYSDATE)`;
    const binds = [];

    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (doctorId) {
        sql += ` AND a.doctor_id = :${binds.length + 1}`;
        binds.push(doctorId);
      }
    }
    sql += ` ORDER BY a.appointment_time`;
    const result = await query(sql, binds);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST book appointment
exports.bookAppointment = async (req, res) => {
  const { doctor_id, appointment_date, appointment_time, reason } = req.body;
  try {
    let patient_id = req.body.patient_id;
    if (req.user.role === "patient") {
      const pt = await query(
        `SELECT patient_id FROM patients WHERE user_id = :1`,
        [req.user.userId],
      );
      if (!pt.rows[0])
        return res
          .status(400)
          .json({ success: false, message: "Patient profile not found" });
      patient_id = pt.rows[0].PATIENT_ID;
    }

    // Check for conflict
    const conflict = await query(
      `SELECT COUNT(*) AS CNT FROM appointments
       WHERE doctor_id = :1 AND TRUNC(appointment_date) = TO_DATE(:2,'YYYY-MM-DD')
       AND appointment_time = :3 AND status != 'Cancelled'`,
      [doctor_id, appointment_date, appointment_time],
    );
    if (conflict.rows[0].CNT > 0) {
      return res.status(409).json({
        success: false,
        message: "Doctor already has an appointment at that time",
      });
    }

    await query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
       VALUES (:1, :2, TO_DATE(:3,'YYYY-MM-DD'), :4, 'Scheduled', :5)`,
      [
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        reason || null,
      ],
    );
    res
      .status(201)
      .json({ success: true, message: "Appointment booked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH update status
exports.updateAppointmentStatus = async (req, res) => {
  const { status, notes } = req.body;
  try {
    const appointment = await resolveAppointment(req.params.id);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (!doctorId || Number(appointment.DOCTOR_ID) !== Number(doctorId)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    }

    await query(
      `UPDATE appointments SET status = :1, notes = :2 WHERE appointment_id = :3`,
      [status, notes || null, req.params.id],
    );
    res.json({ success: true, message: `Appointment ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH cancel appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await resolveAppointment(req.params.id);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (!doctorId || Number(appointment.DOCTOR_ID) !== Number(doctorId)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    } else if (req.user.role === "patient") {
      const patientResult = await query(
        `SELECT patient_id FROM patients WHERE user_id = :1`,
        [req.user.userId],
      );
      const patientId = patientResult.rows[0]?.PATIENT_ID;
      if (!patientId || Number(appointment.PATIENT_ID) !== Number(patientId)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    }

    await query(
      `UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = :1`,
      [req.params.id],
    );
    res.json({ success: true, message: "Appointment cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET doctor availability
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const result = await query(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = :1 AND TRUNC(appointment_date) = TO_DATE(:2,'YYYY-MM-DD')
       AND status != 'Cancelled'`,
      [doctor_id, date],
    );
    const bookedTimes = result.rows.map((r) => r.APPOINTMENT_TIME);
    const allSlots = [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
      "05:00 PM",
    ];
    res.json({
      success: true,
      data: allSlots.filter((s) => !bookedTimes.includes(s)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
