const db = require("../config/database");

const resolveDoctorId = async (userId) => {
  const result = await db.query(
    "SELECT doctor_id FROM doctors WHERE user_id = :1",
    [userId],
  );
  return result.rows[0]?.DOCTOR_ID || null;
};

const canDoctorAccessPatient = async (doctorId, patientId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS CNT
     FROM appointments
     WHERE doctor_id = :1 AND patient_id = :2`,
    [doctorId, patientId],
  );
  return Number(result.rows[0]?.CNT || 0) > 0;
};

// Get all patients (admin/doctor)
exports.getAllPatients = async (req, res) => {
  try {
    const doctorId =
      req.user.role === "doctor"
        ? await resolveDoctorId(req.user.userId)
        : null;
    const isDoctor = Boolean(doctorId);
    const result = await db.query(
      `
      SELECT u.user_id,
             u.username,
             u.email,
             u.is_active,
             u.created_at,
             p.patient_id,
             p.first_name || ' ' || p.last_name AS full_name,
             p.phone,
             p.date_of_birth,
             p.gender,
             p.blood_group,
             p.address,
             fn_get_patient_age(p.patient_id) AS age,
             (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.patient_id
                ${isDoctor ? "AND a.doctor_id = :doctorId" : ""}) AS total_appointments
      FROM users u
      JOIN patients p ON u.user_id = p.user_id
      ${isDoctor ? "WHERE EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.patient_id AND a.doctor_id = :doctorId)" : ""}
      ORDER BY p.first_name, p.last_name
    `,
      isDoctor ? { doctorId } : [],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get patient by ID
exports.getPatientById = async (req, res) => {
  try {
    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (
        !doctorId ||
        !(await canDoctorAccessPatient(doctorId, req.params.id))
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    }
    const result = await db.query(
      `
      SELECT u.user_id,
             u.username,
             u.email,
             u.is_active,
             p.patient_id,
             p.first_name || ' ' || p.last_name AS full_name,
             p.phone,
             p.date_of_birth,
             p.gender,
             p.blood_group,
             p.address,
             fn_get_patient_age(p.patient_id) AS age
      FROM users u JOIN patients p ON u.user_id = p.user_id
      WHERE p.patient_id = :1
    `,
      [req.params.id],
    );
    if (!result.rows[0])
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get own patient profile
exports.getMyProfile = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT u.user_id,
             u.username,
             u.email,
             u.is_active,
             p.patient_id,
             p.first_name || ' ' || p.last_name AS full_name,
             p.phone,
             p.date_of_birth,
             p.gender,
             p.blood_group,
             p.address,
             fn_get_patient_age(p.patient_id) AS age
      FROM users u JOIN patients p ON u.user_id = p.user_id
      WHERE u.user_id = :1
    `,
      [req.user.userId],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update patient profile
exports.updateProfile = async (req, res) => {
  const { full_name, email, phone, address, blood_group } = req.body;
  try {
    const parts = (full_name || "").trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || full_name || "Patient";
    const lastName = parts.slice(1).join(" ") || firstName;

    await db.query("UPDATE users SET email = :1 WHERE user_id = :2", [
      email,
      req.user.userId,
    ]);
    await db.query(
      "UPDATE patients SET first_name = :1, last_name = :2, phone = :3, address = :4, blood_group = :5 WHERE user_id = :6",
      [
        firstName,
        lastName,
        phone || null,
        address || null,
        blood_group || null,
        req.user.userId,
      ],
    );
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get patient medical history
exports.getMedicalHistory = async (req, res) => {
  try {
    const patientId = req.params.id;
    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (!doctorId || !(await canDoctorAccessPatient(doctorId, patientId))) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    }
    const [appointments, prescriptions] = await Promise.all([
      db.query(
        `
        SELECT a.appointment_id, a.appointment_date, a.status, a.notes,
           dr.first_name || ' ' || dr.last_name AS doctor_name, dr.specialization
        FROM appointments a
        JOIN doctors dr ON a.doctor_id = dr.doctor_id
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.patient_id = :1 ORDER BY a.appointment_date DESC
      `,
        [patientId],
      ),
      db.query(
        `
        SELECT pr.prescription_id, pr.created_at, pr.notes AS prescription_notes,
           d.first_name || ' ' || d.last_name AS doctor_name,
               COUNT(pi.item_id) AS medicine_count
        FROM prescriptions pr
        JOIN doctors d ON pr.doctor_id = d.doctor_id
        LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
        WHERE pr.patient_id = :1
         GROUP BY pr.prescription_id, pr.created_at, pr.notes, d.first_name, d.last_name
        ORDER BY pr.created_at DESC
      `,
        [patientId],
      ),
    ]);
    res.json({
      success: true,
      data: {
        appointments: appointments.rows,
        prescriptions: prescriptions.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my prescriptions (patient)
exports.getMyPrescriptions = async (req, res) => {
  try {
    const patientResult = await db.query(
      "SELECT patient_id FROM patients WHERE user_id = :1",
      [req.user.userId],
    );
    const patientId = patientResult.rows[0]?.PATIENT_ID;
    const result = await db.query(
      `
      SELECT pr.prescription_id, pr.created_at, pr.notes,
              d.first_name || ' ' || d.last_name AS doctor_name, d.specialization,
             pi.item_id, m.name AS medicine_name, pi.dosage, pi.duration_days AS duration, pi.instructions
      FROM prescriptions pr
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
      LEFT JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pr.patient_id = :1
      ORDER BY pr.created_at DESC
    `,
      [patientId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete patient (admin only)
exports.deletePatient = async (req, res) => {
  let conn;

  try {
    const patientId = req.params.id;

    // Get the user_id associated with this patient
    const patientResult = await db.query(
      "SELECT user_id FROM patients WHERE patient_id = :1",
      [patientId],
    );

    if (!patientResult.rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const userId = patientResult.rows[0].USER_ID;

    const { getConnection, queryNoCommit } = require("../config/database");
    conn = await getConnection();

    // Delete in correct order due to foreign key constraints
    // 1. Delete prescription items first
    await queryNoCommit(
      conn,
      "DELETE FROM prescription_items WHERE prescription_id IN (SELECT prescription_id FROM prescriptions WHERE patient_id = :1)",
      [patientId],
    );

    // 2. Delete prescriptions
    await queryNoCommit(
      conn,
      "DELETE FROM prescriptions WHERE patient_id = :1",
      [patientId],
    );

    // 3. Delete sales records
    await queryNoCommit(
      conn,
      "DELETE FROM sale_items WHERE sale_id IN (SELECT sale_id FROM sales WHERE patient_id = :1)",
      [patientId],
    );

    await queryNoCommit(conn, "DELETE FROM sales WHERE patient_id = :1", [
      patientId,
    ]);

    // 4. Delete appointments
    await queryNoCommit(
      conn,
      "DELETE FROM appointments WHERE patient_id = :1",
      [patientId],
    );

    // 5. Delete the patient
    await queryNoCommit(conn, "DELETE FROM patients WHERE patient_id = :1", [
      patientId,
    ]);

    // 6. Delete the associated user
    await queryNoCommit(conn, "DELETE FROM users WHERE user_id = :1", [userId]);

    await conn.commit();
    await conn.close();

    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(() => {});
      await conn.close().catch(() => {});
    }
    console.error("Delete patient error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
