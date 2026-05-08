const db = require("../config/database");

// Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.user_id, u.username, u.email, 
             d.first_name || ' ' || d.last_name AS full_name, d.phone, u.is_active,
             d.doctor_id, d.specialization, d.license_number, d.consultation_fee,
             fn_count_appointments_today(d.doctor_id) AS today_appointments
      FROM users u
      JOIN doctors d ON u.user_id = d.user_id
      ORDER BY d.first_name || ' ' || d.last_name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get doctor by ID
exports.getDoctorById = async (req, res) => {
  try {
    const result = await db.query(
      `
            SELECT u.user_id, u.username, u.email, 
              d.first_name || ' ' || d.last_name AS full_name, d.phone, u.is_active, u.created_at,
              d.doctor_id, d.specialization, d.license_number, d.consultation_fee
            FROM users u JOIN doctors d ON u.user_id = d.user_id
            WHERE d.doctor_id = :1
    `,
      [req.params.id],
    );
    if (!result.rows[0])
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get doctor schedule (appointments)
exports.getDoctorSchedule = async (req, res) => {
  try {
    const doctorId =
      req.user.role === "doctor"
        ? (
            await db.query("SELECT doctor_id FROM doctors WHERE user_id = :1", [
              req.user.userId,
            ])
          ).rows[0]?.DOCTOR_ID
        : req.params.id;

    const result = await db.query(
      `
      SELECT a.appointment_id, a.appointment_date, a.status, a.notes,
             p.first_name || ' ' || p.last_name AS patient_name, p.date_of_birth
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.doctor_id = :1
      ORDER BY a.appointment_date DESC
    `,
      [doctorId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update doctor profile
exports.updateDoctorProfile = async (req, res) => {
  const { specialization, consultation_fee, phone } = req.body;
  try {
    const doctorResult = await db.query(
      "SELECT doctor_id FROM doctors WHERE user_id = :1",
      [req.user.userId],
    );
    const doctorId = doctorResult.rows[0]?.DOCTOR_ID;
    if (!doctorId)
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });

    await db.query(
      "UPDATE doctors SET specialization = :1, consultation_fee = :2 WHERE doctor_id = :3",
      [specialization, consultation_fee, doctorId],
    );
    await db.query("UPDATE users SET phone = :1 WHERE user_id = :2", [
      phone,
      req.user.userId,
    ]);
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add diagnosis note
exports.addDiagnosisNote = async (req, res) => {
  const { appointment_id, notes } = req.body;
  try {
    await db.query(
      "UPDATE appointments SET notes = :1 WHERE appointment_id = :2",
      [notes, appointment_id],
    );
    res.json({ success: true, message: "Diagnosis note added" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
