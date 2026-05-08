// controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const { query, getConnection } = require("../config/database");
const { generateToken } = require("../middleware/auth.middleware");

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    // Get user by email
    const result = await query(
      `SELECT user_id, username, email, password_hash, role, is_active
       FROM users WHERE LOWER(email) = LOWER(:1)`,
      [email],
    );

    if (!result.rows || result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const user = result.rows[0];

    if (user.IS_ACTIVE === 0) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact admin.",
      });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!valid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    // Update last_login
    await query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = :1`,
      [user.USER_ID],
    );

    // Get role-specific profile
    let profileId = null;
    let fullName = user.USERNAME;
    let extraData = {};

    if (user.ROLE === "patient") {
      const pr = await query(
        `SELECT patient_id, first_name, last_name FROM patients WHERE user_id = :1`,
        [user.USER_ID],
      );
      if (pr.rows[0]) {
        profileId = pr.rows[0].PATIENT_ID;
        fullName = pr.rows[0].FIRST_NAME + " " + pr.rows[0].LAST_NAME;
      }
    } else if (user.ROLE === "doctor") {
      const pr = await query(
        `SELECT doctor_id, first_name, last_name, specialization FROM doctors WHERE user_id = :1`,
        [user.USER_ID],
      );
      if (pr.rows[0]) {
        profileId = pr.rows[0].DOCTOR_ID;
        fullName = "Dr. " + pr.rows[0].FIRST_NAME + " " + pr.rows[0].LAST_NAME;
        extraData.specialization = pr.rows[0].SPECIALIZATION;
      }
    } else if (user.ROLE === "pharmacist") {
      const pr = await query(
        `SELECT pharmacist_id, first_name, last_name FROM pharmacists WHERE user_id = :1`,
        [user.USER_ID],
      );
      if (pr.rows[0]) {
        profileId = pr.rows[0].PHARMACIST_ID;
        fullName = pr.rows[0].FIRST_NAME + " " + pr.rows[0].LAST_NAME;
      }
    } else if (user.ROLE === "supplier") {
      const pr = await query(
        `SELECT supplier_id, company_name, contact_person FROM suppliers WHERE user_id = :1`,
        [user.USER_ID],
      );
      if (pr.rows[0]) {
        profileId = pr.rows[0].SUPPLIER_ID;
        fullName = pr.rows[0].COMPANY_NAME;
        extraData.contactPerson = pr.rows[0].CONTACT_PERSON;
      }
    } else if (user.ROLE === "admin") {
      fullName = "Administrator";
    }

    const token = generateToken({
      userId: user.USER_ID,
      role: user.ROLE,
      username: user.USERNAME,
      profileId,
    });

    res.json({
      success: true,
      token,
      user: {
        userId: user.USER_ID,
        username: user.USERNAME,
        email: user.EMAIL,
        role: user.ROLE,
        full_name: fullName,
        profileId,
        ...extraData,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Login failed: " + err.message });
  }
};

/**
 * POST /api/auth/register  (patient self-registration)
 */
const register = async (req, res) => {
  const conn = await getConnection();
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      address,
    } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      await conn.close();
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    // Check duplicate
    const dup = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM users WHERE LOWER(email) = LOWER(:1) OR LOWER(username) = LOWER(:2)`,
      [email, username],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT },
    );
    if (dup.rows[0].CNT > 0) {
      await conn.close();
      return res
        .status(409)
        .json({ success: false, message: "Email or username already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    // Insert user
    const userRes = await conn.execute(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (:u, :e, :h, 'patient')
       RETURNING user_id INTO :uid`,
      {
        u: username,
        e: email,
        h: hash,
        uid: {
          dir: require("oracledb").BIND_OUT,
          type: require("oracledb").NUMBER,
        },
      },
    );
    const newUserId = userRes.outBinds.uid[0];

    // Insert patient profile
    await conn.execute(
      `INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, phone, address)
       VALUES (:uid, :fn, :ln, TO_DATE(:dob,'YYYY-MM-DD'), :g, :ph, :addr)`,
      {
        uid: newUserId,
        fn: firstName,
        ln: lastName,
        dob: dateOfBirth || "2000-01-01",
        g: gender || "Other",
        ph: phone || null,
        addr: address || null,
      },
    );

    await conn.commit();
    await conn.close();

    res.status(201).json({
      success: true,
      message: "Registration successful. Please login.",
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    await conn.close().catch(() => {});
    console.error("Register error:", err);
    res
      .status(500)
      .json({ success: false, message: "Registration failed: " + err.message });
  }
};

/**
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, currentPassword, new_password, newPassword } =
      req.body;
    const curPwd = current_password || currentPassword;
    const newPwd = new_password || newPassword;

    const result = await query(
      `SELECT password_hash FROM users WHERE user_id = :1`,
      [req.user.userId],
    );
    if (!result.rows[0])
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const valid = await bcrypt.compare(curPwd, result.rows[0].PASSWORD_HASH);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPwd, 10);
    await query(`UPDATE users SET password_hash = :1 WHERE user_id = :2`, [
      newHash,
      req.user.userId,
    ]);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT user_id, username, email, role, is_active, last_login, created_at
       FROM users WHERE user_id = :1`,
      [req.user.userId],
    );
    if (!result.rows[0])
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const u = result.rows[0];
    res.json({
      success: true,
      user: {
        userId: u.USER_ID,
        username: u.USERNAME,
        email: u.EMAIL,
        role: u.ROLE,
        isActive: u.IS_ACTIVE,
        lastLogin: u.LAST_LOGIN,
        createdAt: u.CREATED_AT,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

module.exports = { login, register, changePassword, getMe };
