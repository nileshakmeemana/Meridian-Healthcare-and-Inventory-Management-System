// routes/admin.routes.js
const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { query } = require("../config/database");

router.use(authenticate, authorize("admin"));

const buildUniqueUsername = async (baseUsername) => {
  const seed = baseUsername
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".");
  let candidate = seed;
  let suffix = 1;

  while (true) {
    const result = await query(
      `SELECT 1 FROM users WHERE username = :1 FETCH FIRST 1 ROWS ONLY`,
      [candidate],
    );
    if (!result.rows.length) return candidate;
    candidate = `${seed}${suffix}`;
    suffix += 1;
  }
};

// GET all users
router.get("/users", async (req, res) => {
  try {
    const result = await query(
      `SELECT u.user_id,
              u.username,
              u.email,
              u.role,
              u.is_active,
              u.last_login,
              u.created_at,
              COALESCE(
                CASE WHEN u.role = 'supplier' THEN s.company_name END,
                CASE WHEN u.role = 'doctor' THEN 'Dr. ' || d.first_name || ' ' || d.last_name END,
                CASE WHEN u.role = 'pharmacist' THEN p.first_name || ' ' || p.last_name END,
                CASE WHEN u.role = 'patient' THEN pt.first_name || ' ' || pt.last_name END,
                u.username
              ) AS full_name,
              COALESCE(s.phone, d.phone, p.phone, pt.phone) AS phone
       FROM users u
       LEFT JOIN suppliers s ON s.user_id = u.user_id
       LEFT JOIN doctors d ON d.user_id = u.user_id
       LEFT JOIN pharmacists p ON p.user_id = u.user_id
      LEFT JOIN patients pt ON pt.user_id = u.user_id
         
         ORDER BY u.created_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create user
router.post("/users", async (req, res) => {
  const bcrypt = require("bcryptjs");
  try {
    const {
      email,
      password,
      role,
      full_name,
      username: providedUsername,
    } = req.body;
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "email, password, role required" });
    }
    const existingUser = await query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER(:1) FETCH FIRST 1 ROWS ONLY`,
      [email],
    );
    if (existingUser.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    const username = (providedUsername || full_name || email.split("@")[0])
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ".");
    await query(
      `INSERT INTO users (username, email, password_hash, role) VALUES (:1, :2, :3, :4)`,
      [username, email, hash, role],
    );
    // Return the newly created user row so frontend can update list consistently
    const newRes = await query(
      `SELECT u.user_id,
              u.username,
              u.email,
              u.role,
              u.is_active,
              u.last_login,
              u.created_at,
              COALESCE(
                CASE WHEN u.role = 'supplier' THEN s.company_name END,
                CASE WHEN u.role = 'doctor' THEN 'Dr. ' || d.first_name || ' ' || d.last_name END,
                CASE WHEN u.role = 'pharmacist' THEN p.first_name || ' ' || p.last_name END,
                CASE WHEN u.role = 'patient' THEN pt.first_name || ' ' || pt.last_name END,
                u.username
              ) AS full_name,
              COALESCE(s.phone, d.phone, p.phone, pt.phone) AS phone
       FROM users u
       LEFT JOIN suppliers s ON s.user_id = u.user_id
       LEFT JOIN doctors d ON d.user_id = u.user_id
       LEFT JOIN pharmacists p ON p.user_id = u.user_id
       LEFT JOIN patients pt ON pt.user_id = u.user_id
       WHERE u.email = :1
       ORDER BY u.created_at DESC
       FETCH FIRST 1 ROWS ONLY`,
      [email],
    );
    res.status(201).json({ success: true, data: newRes.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update user
router.put("/users/:id", async (req, res) => {
  try {
    const { email, role } = req.body;
    await query(`UPDATE users SET email = :1, role = :2 WHERE user_id = :3`, [
      email,
      role,
      req.params.id,
    ]);
    res.json({ success: true, message: "User updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH toggle active
router.patch("/users/:id/toggle", async (req, res) => {
  try {
    await query(
      `UPDATE users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE user_id = :1`,
      [req.params.id],
    );
    res.json({ success: true, message: "User status toggled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE user
router.delete("/users/:id", async (req, res) => {
  try {
    await query(`DELETE FROM users WHERE user_id = :1 AND role != 'admin'`, [
      req.params.id,
    ]);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DOCTORS ──────────────────────────────────────────────────────────────────
// GET all doctors
router.get("/doctors", async (req, res) => {
  try {
    const result = await query(
      `SELECT d.doctor_id,
              d.user_id,
              d.first_name,
              d.last_name,
              d.specialization,
              d.license_number,
              d.phone,
              d.experience_years,
              d.consultation_fee,
              u.username,
              u.email,
              u.is_active,
              u.created_at
       FROM doctors d
       JOIN users u ON u.user_id = d.user_id
       
       ORDER BY d.created_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create doctor (creates user + doctor record)
router.post("/doctors", async (req, res) => {
  const bcrypt = require("bcryptjs");
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      specialization,
      license_number,
      phone,
      experience_years,
      consultation_fee,
    } = req.body;
    if (
      !email ||
      !password ||
      !first_name ||
      !last_name ||
      !specialization ||
      !license_number
    ) {
      return res.status(400).json({
        success: false,
        message:
          "email, password, first_name, last_name, specialization, license_number required",
      });
    }
    const existingEmail = await query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER(:1) FETCH FIRST 1 ROWS ONLY`,
      [email],
    );
    if (existingEmail.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    const existingLicense = await query(
      `SELECT 1 FROM doctors WHERE LOWER(license_number) = LOWER(:1) FETCH FIRST 1 ROWS ONLY`,
      [license_number],
    );
    if (existingLicense.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "License number already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    const username = await buildUniqueUsername(
      email.split("@")[0] || `dr.${last_name}`,
    );

    // Create user
    await query(
      `INSERT INTO users (username, email, password_hash, role) VALUES (:1, :2, :3, :4)`,
      [username, email, hash, "doctor"],
    );

    // Get the created user_id
    const userRes = await query(`SELECT user_id FROM users WHERE email = :1`, [
      email,
    ]);
    const user_id = userRes.rows[0].USER_ID;

    // Create doctor record
    await query(
      `INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number, phone, experience_years, consultation_fee)
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
      [
        user_id,
        first_name,
        last_name,
        specialization,
        license_number,
        phone || null,
        experience_years || 0,
        consultation_fee || 0,
      ],
    );

    // Return the created doctor
    const newRes = await query(
      `SELECT d.doctor_id, d.user_id, d.first_name, d.last_name, d.specialization, d.license_number, d.phone, d.experience_years, d.consultation_fee, u.username, u.email, u.is_active, u.created_at
       FROM doctors d
       JOIN users u ON u.user_id = d.user_id
       WHERE u.email = :1`,
      [email],
    );
    res.status(201).json({ success: true, data: newRes.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update doctor
router.put("/doctors/:id", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      specialization,
      phone,
      experience_years,
      consultation_fee,
      email,
    } = req.body;
    await query(
      `UPDATE doctors SET first_name = :1, last_name = :2, specialization = :3, phone = :4, experience_years = :5, consultation_fee = :6
       WHERE doctor_id = :7`,
      [
        first_name,
        last_name,
        specialization,
        phone || null,
        experience_years || 0,
        consultation_fee || 0,
        req.params.id,
      ],
    );
    if (email) {
      const doctorRes = await query(
        `SELECT user_id FROM doctors WHERE doctor_id = :1`,
        [req.params.id],
      );
      const user_id = doctorRes.rows[0].USER_ID;
      await query(`UPDATE users SET email = :1 WHERE user_id = :2`, [
        email,
        user_id,
      ]);
    }
    res.json({ success: true, message: "Doctor updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH toggle doctor active status
router.patch("/doctors/:id/toggle", async (req, res) => {
  try {
    const doctorRes = await query(
      `SELECT user_id FROM doctors WHERE doctor_id = :1`,
      [req.params.id],
    );
    if (!doctorRes.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    const user_id = doctorRes.rows[0].USER_ID;
    await query(
      `UPDATE users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE user_id = :1`,
      [user_id],
    );
    res.json({ success: true, message: "Doctor status toggled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE doctor
router.delete("/doctors/:id", async (req, res) => {
  try {
    const { getConnection, queryNoCommit } = require("../config/database");
    let conn;
    
    try {
      const doctorRes = await query(
        `SELECT user_id FROM doctors WHERE doctor_id = :1`,
        [req.params.id],
      );
      if (!doctorRes.rows.length)
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      const user_id = doctorRes.rows[0].USER_ID;
      
      conn = await getConnection();
      
      // Delete in correct order due to foreign key constraints
      // 1. Delete prescription items first
      await queryNoCommit(
        conn,
        `DELETE FROM prescription_items WHERE prescription_id IN (SELECT prescription_id FROM prescriptions WHERE doctor_id = :1)`,
        [req.params.id],
      );
      
      // 2. Delete prescriptions
      await queryNoCommit(
        conn,
        `DELETE FROM prescriptions WHERE doctor_id = :1`,
        [req.params.id],
      );
      
      // 3. Delete appointments
      await queryNoCommit(
        conn,
        `DELETE FROM appointments WHERE doctor_id = :1`,
        [req.params.id],
      );
      
      // 4. Delete the doctor record
      await queryNoCommit(
        conn,
        `DELETE FROM doctors WHERE doctor_id = :1`,
        [req.params.id],
      );
      
      // 5. Delete the associated user
      await queryNoCommit(conn, `DELETE FROM users WHERE user_id = :1`, [user_id]);
      
      await conn.commit();
      await conn.close();
      
      res.json({ success: true, message: "Doctor deleted" });
    } catch (err) {
      if (conn) {
        await conn.rollback().catch(() => {});
        await conn.close().catch(() => {});
      }
      throw err;
    }
  } catch (err) {
    console.error("Delete doctor error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PHARMACISTS ──────────────────────────────────────────────────────────────
// GET all pharmacists
router.get("/pharmacists", async (req, res) => {
  try {
    const result = await query(
      `SELECT p.pharmacist_id,
              p.user_id,
              p.first_name,
              p.last_name,
              p.shift,
              p.license_number,
              p.phone,
              u.username,
              u.email,
              u.is_active,
              u.created_at
       FROM pharmacists p
       JOIN users u ON u.user_id = p.user_id
       ORDER BY p.created_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create pharmacist
router.post("/pharmacists", async (req, res) => {
  const bcrypt = require("bcryptjs");
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      shift,
      license_number,
      phone,
    } = req.body;
    if (!email || !password || !first_name || !last_name || !license_number) {
      return res.status(400).json({
        success: false,
        message:
          "email, password, first_name, last_name, license_number required",
      });
    }
    const existingEmail = await query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER(:1) FETCH FIRST 1 ROWS ONLY`,
      [email],
    );
    if (existingEmail.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    const existingLicense = await query(
      `SELECT 1 FROM pharmacists WHERE LOWER(license_number) = LOWER(:1) FETCH FIRST 1 ROWS ONLY`,
      [license_number],
    );
    if (existingLicense.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "License number already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    const username = await buildUniqueUsername(
      email.split("@")[0] || `pharm.${last_name}`,
    );

    // Create user
    await query(
      `INSERT INTO users (username, email, password_hash, role) VALUES (:1, :2, :3, :4)`,
      [username, email, hash, "pharmacist"],
    );

    // Get the created user_id
    const userRes = await query(`SELECT user_id FROM users WHERE email = :1`, [
      email,
    ]);
    const user_id = userRes.rows[0].USER_ID;

    // Create pharmacist record
    await query(
      `INSERT INTO pharmacists (user_id, first_name, last_name, shift, license_number, phone)
       VALUES (:1, :2, :3, :4, :5, :6)`,
      [
        user_id,
        first_name,
        last_name,
        shift || "Morning",
        license_number,
        phone || null,
      ],
    );

    // Return the created pharmacist
    const newRes = await query(
      `SELECT p.pharmacist_id, p.user_id, p.first_name, p.last_name, p.shift, p.license_number, p.phone, u.username, u.email, u.is_active, u.created_at
       FROM pharmacists p
       JOIN users u ON u.user_id = p.user_id
       WHERE u.email = :1`,
      [email],
    );
    res.status(201).json({ success: true, data: newRes.rows[0] });
  } catch (err) {
    if (err?.errorNum === 1 || err?.code === "ORA-00001") {
      return res.status(409).json({
        success: false,
        message: "A record with this value already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATIENTS ─────────────────────────────────────────────────────────────────
// GET all patients
router.get("/patients", async (req, res) => {
  try {
    const result = await query(
      `SELECT pt.patient_id,
              pt.user_id,
              pt.first_name,
              pt.last_name,
              pt.date_of_birth,
              pt.gender,
              pt.blood_group,
              pt.phone,
              pt.address,
              pt.emergency_contact,
              pt.emergency_phone,
              u.username,
              u.email,
              u.is_active,
              u.created_at,
              fn_get_patient_age(pt.patient_id) AS age,
              (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = pt.patient_id) AS total_appointments
       FROM patients pt
       JOIN users u ON u.user_id = pt.user_id
       ORDER BY pt.created_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create patient (creates user + patient record)
router.post("/patients", async (req, res) => {
  const bcrypt = require("bcryptjs");
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      date_of_birth,
      gender,
      blood_group,
      phone,
      address,
      emergency_contact,
      emergency_phone,
    } = req.body;
    if (
      !email ||
      !password ||
      !first_name ||
      !last_name ||
      !date_of_birth ||
      !gender
    ) {
      return res.status(400).json({
        success: false,
        message:
          "email, password, first_name, last_name, date_of_birth, gender required",
      });
    }
    const existingEmail = await query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER(:1) FETCH FIRST 1 ROWS ONLY`,
      [email],
    );
    if (existingEmail.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const username = await buildUniqueUsername(
      email.split("@")[0] || `pt.${last_name}`,
    );

    // Create user
    await query(
      `INSERT INTO users (username, email, password_hash, role) VALUES (:1, :2, :3, :4)`,
      [username, email, hash, "patient"],
    );

    // Get the created user_id
    const userRes = await query(`SELECT user_id FROM users WHERE email = :1`, [
      email,
    ]);
    const user_id = userRes.rows[0].USER_ID;

    // Create patient record
    await query(
      `INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone)
       VALUES (:1, :2, :3, TO_DATE(:4,'YYYY-MM-DD'), :5, :6, :7, :8, :9, :10)`,
      [
        user_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        blood_group || null,
        phone || null,
        address || null,
        emergency_contact || null,
        emergency_phone || null,
      ],
    );

    // Return the created patient combined with user info
    const newRes = await query(
      `SELECT pt.patient_id, pt.user_id, pt.first_name, pt.last_name, pt.date_of_birth, pt.gender, pt.blood_group, pt.phone, pt.address, pt.emergency_contact, pt.emergency_phone, u.username, u.email, u.is_active, u.created_at
       FROM patients pt
       JOIN users u ON u.user_id = pt.user_id
       WHERE u.email = :1`,
      [email],
    );
    res.status(201).json({ success: true, data: newRes.rows[0] });
  } catch (err) {
    if (err?.errorNum === 1 || err?.code === "ORA-00001") {
      return res.status(409).json({
        success: false,
        message: "A record with this value already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update pharmacist
router.put("/pharmacists/:id", async (req, res) => {
  try {
    const { first_name, last_name, shift, phone, email } = req.body;
    await query(
      `UPDATE pharmacists SET first_name = :1, last_name = :2, shift = :3, phone = :4
       WHERE pharmacist_id = :5`,
      [first_name, last_name, shift || "Morning", phone || null, req.params.id],
    );
    if (email) {
      const pharmRes = await query(
        `SELECT user_id FROM pharmacists WHERE pharmacist_id = :1`,
        [req.params.id],
      );
      const user_id = pharmRes.rows[0].USER_ID;
      await query(`UPDATE users SET email = :1 WHERE user_id = :2`, [
        email,
        user_id,
      ]);
    }
    res.json({ success: true, message: "Pharmacist updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH toggle pharmacist active status
router.patch("/pharmacists/:id/toggle", async (req, res) => {
  try {
    const pharmRes = await query(
      `SELECT user_id FROM pharmacists WHERE pharmacist_id = :1`,
      [req.params.id],
    );
    if (!pharmRes.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Pharmacist not found" });
    const user_id = pharmRes.rows[0].USER_ID;
    await query(
      `UPDATE users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE user_id = :1`,
      [user_id],
    );
    res.json({ success: true, message: "Pharmacist status toggled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE pharmacist
router.delete("/pharmacists/:id", async (req, res) => {
  try {
    const { getConnection, queryNoCommit } = require("../config/database");
    let conn;
    
    try {
      const pharmRes = await query(
        `SELECT user_id FROM pharmacists WHERE pharmacist_id = :1`,
        [req.params.id],
      );
      if (!pharmRes.rows.length)
        return res
          .status(404)
          .json({ success: false, message: "Pharmacist not found" });
      const user_id = pharmRes.rows[0].USER_ID;
      
      conn = await getConnection();
      
      // Delete in correct order due to foreign key constraints
      // 1. Delete sale items first
      await queryNoCommit(
        conn,
        `DELETE FROM sale_items WHERE sale_id IN (SELECT sale_id FROM sales WHERE pharmacist_id = :1)`,
        [req.params.id],
      );
      
      // 2. Delete sales records
      await queryNoCommit(
        conn,
        `DELETE FROM sales WHERE pharmacist_id = :1`,
        [req.params.id],
      );
      
      // 3. Delete the pharmacist record
      await queryNoCommit(
        conn,
        `DELETE FROM pharmacists WHERE pharmacist_id = :1`,
        [req.params.id],
      );
      
      // 4. Delete the associated user
      await queryNoCommit(conn, `DELETE FROM users WHERE user_id = :1`, [user_id]);
      
      await conn.commit();
      await conn.close();
      
      res.json({ success: true, message: "Pharmacist deleted" });
    } catch (err) {
      if (conn) {
        await conn.rollback().catch(() => {});
        await conn.close().catch(() => {});
      }
      throw err;
    }
  } catch (err) {
    console.error("Delete pharmacist error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
