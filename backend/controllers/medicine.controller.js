// controllers/medicine.controller.js
const { query, getConnection, oracledb } = require("../config/database");

// GET all medicines
exports.getAllMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;
    let sql = `
      SELECT medicine_id, name, generic_name, category, manufacturer,
             unit_price, stock_quantity, reorder_level, expiry_date,
             dosage_form, strength, requires_prescription,
             CASE
               WHEN expiry_date < SYSDATE THEN 'Expired'
               WHEN stock_quantity = 0 THEN 'Critical'
               WHEN stock_quantity <= reorder_level THEN 'Low'
               ELSE 'Normal'
             END AS stock_status
      FROM medicines WHERE 1=1`;
    const binds = [];
    if (search) {
      sql += ` AND (LOWER(name) LIKE LOWER(:1) OR LOWER(generic_name) LIKE LOWER(:2))`;
      binds.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ` AND category = :3`;
      binds.push(category);
    }
    sql += ` ORDER BY name`;
    const result = await query(sql, binds);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export helper for other controllers
exports.notifyLowStockIfNeeded = notifyLowStockIfNeeded;

// GET single medicine
exports.getMedicineById = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM medicines WHERE medicine_id = :1`,
      [req.params.id],
    );
    if (!result.rows[0])
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create medicine
exports.createMedicine = async (req, res) => {
  const {
    name,
    generic_name,
    category,
    manufacturer,
    unit_price,
    stock_quantity,
    reorder_level,
    expiry_date,
    dosage_form,
    strength,
    requires_prescription,
    description,
  } = req.body;
  try {
    await query(
      `INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription, description)
       VALUES (:1, :2, :3, :4, :5, :6, :7, TO_DATE(:8,'YYYY-MM-DD'), :9, :10, :11, :12)`,
      [
        name,
        generic_name || null,
        category,
        manufacturer || null,
        unit_price,
        stock_quantity || 0,
        reorder_level || 10,
        expiry_date || null,
        dosage_form || null,
        strength || null,
        requires_prescription || 0,
        description || null,
      ],
    );
    // If expiry_date provided, notify if expiring soon
    if (expiry_date) {
      try {
        const newRes = await query(
          `SELECT medicine_id FROM medicines WHERE name = :1 ORDER BY created_at DESC FETCH FIRST 1 ROWS ONLY`,
          [name],
        );
        const newId = newRes.rows[0]?.MEDICINE_ID;
        if (newId) await notifyExpiryIfNeeded(newId);
      } catch (e) {
        console.error("notifyExpiryIfNeeded on create error:", e.message || e);
      }
    }
    res.status(201).json({ success: true, message: "Medicine created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT update medicine
exports.updateMedicine = async (req, res) => {
  const {
    name,
    generic_name,
    category,
    manufacturer,
    unit_price,
    reorder_level,
    expiry_date,
    dosage_form,
    strength,
    requires_prescription,
    description,
  } = req.body;
  try {
    await query(
      `UPDATE medicines SET name=:1, generic_name=:2, category=:3, manufacturer=:4,
       unit_price=:5, reorder_level=:6, expiry_date=TO_DATE(:7,'YYYY-MM-DD'),
       dosage_form=:8, strength=:9, requires_prescription=:10, description=:11
       WHERE medicine_id=:12`,
      [
        name,
        generic_name || null,
        category,
        manufacturer || null,
        unit_price,
        reorder_level || 10,
        expiry_date || null,
        dosage_form || null,
        strength || null,
        requires_prescription || 0,
        description || null,
        req.params.id,
      ],
    );
    // If expiry_date provided, check and notify
    if (expiry_date) {
      try {
        await notifyExpiryIfNeeded(req.params.id);
      } catch (e) {
        console.error("notifyExpiryIfNeeded on update error:", e.message || e);
      }
    }
    res.json({ success: true, message: "Medicine updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH update stock
exports.updateStock = async (req, res) => {
  const { quantity_change, reason, change_type } = req.body;
  try {
    await query(
      `UPDATE medicines SET stock_quantity = stock_quantity + :1 WHERE medicine_id = :2`,
      [quantity_change, req.params.id],
    );
    // Log to stock_history
    await query(
      `INSERT INTO stock_history (medicine_id, changed_by, change_type, quantity_before, quantity_change, quantity_after, reason)
       SELECT medicine_id, :1, :2, stock_quantity - :3, :4, stock_quantity, :5
       FROM medicines WHERE medicine_id = :6`,
      [
        req.user.userId,
        change_type || "Add",
        quantity_change,
        quantity_change,
        reason || null,
        req.params.id,
      ],
    );
    // After updating stock and logging history, notify if stock is low
    try {
      await notifyLowStockIfNeeded(req.params.id);
    } catch (e) {
      console.error("notifyLowStockIfNeeded error:", e.message || e);
    }
    res.json({ success: true, message: "Stock updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: create low-stock notifications for admins/pharmacists
async function notifyLowStockIfNeeded(medicineId) {
  const { query } = require("../config/database");
  try {
    const medRes = await query(
      `SELECT medicine_id, name, stock_quantity, reorder_level FROM medicines WHERE medicine_id = :1`,
      [medicineId],
    );
    const med = medRes.rows[0];
    if (!med) return;
    if (Number(med.STOCK_QUANTITY) > Number(med.REORDER_LEVEL)) return; // not low

    const msg = `Medicine ${med.NAME} is low on stock (${med.STOCK_QUANTITY}).`;

    // Avoid creating duplicate unread notification for same medicine
    const dup = await query(
      `SELECT COUNT(*) AS CNT FROM notifications WHERE message LIKE :1 AND is_read = 0`,
      [`%${med.NAME}%`],
    );
    if (dup.rows[0]?.CNT > 0) return;

    const users = await query(
      `SELECT user_id FROM users WHERE role IN ('admin','pharmacist') AND is_active = 1`,
    );
    for (const u of users.rows) {
      await query(
        `INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (seq_notifications.NEXTVAL, :1, :2, :3, 'Stock')`,
        [u.USER_ID, `Low stock: ${med.NAME}`, msg],
      );
    }
  } catch (e) {
    // Log and continue
    console.error("Low stock notify error:", e.message || e);
  }
}

// Helper: notify if medicine is expiring soon (within 30 days)
async function notifyExpiryIfNeeded(medicineId) {
  const { query } = require("../config/database");
  try {
    const medRes = await query(
      `SELECT medicine_id, name, expiry_date FROM medicines WHERE medicine_id = :1`,
      [medicineId],
    );
    const med = medRes.rows[0];
    if (!med || !med.EXPIRY_DATE) return;
    // Check if expiry within 30 days
    const expRes = await query(
      `SELECT 1 FROM medicines WHERE medicine_id = :1 AND expiry_date <= SYSDATE + 30`,
      [medicineId],
    );
    if (!expRes.rows || expRes.rows.length === 0) return;

    const msg = `Medicine ${med.NAME} is expiring on ${med.EXPIRY_DATE}.`;
    // Avoid duplicate unread notifications
    const dup = await query(
      `SELECT COUNT(*) AS CNT FROM notifications WHERE message LIKE :1 AND is_read = 0`,
      [`%${med.NAME}%`],
    );
    if (dup.rows[0]?.CNT > 0) return;

    const users = await query(
      `SELECT user_id FROM users WHERE role IN ('admin','pharmacist') AND is_active = 1`,
    );
    for (const u of users.rows) {
      await query(
        `INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (seq_notifications.NEXTVAL, :1, :2, :3, 'Alert')`,
        [u.USER_ID, `Expiring: ${med.NAME}`, msg],
      );
    }
  } catch (e) {
    console.error("Expiry notify error:", e.message || e);
  }
}

// Export expiry helper
exports.notifyExpiryIfNeeded = notifyExpiryIfNeeded;

// GET low stock
exports.getLowStockMedicines = async (req, res) => {
  try {
    const result = await query(
      `SELECT medicine_id, name, category, stock_quantity, reorder_level, expiry_date
       FROM medicines WHERE stock_quantity <= reorder_level ORDER BY stock_quantity`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET categories
exports.getCategories = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT category FROM medicines ORDER BY category`,
    );
    res.json({ success: true, data: result.rows.map((r) => r.CATEGORY) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET stock history
exports.getStockHistory = async (req, res) => {
  try {
    const result = await query(
      `SELECT sh.*, m.name AS medicine_name, u.username AS changed_by_name
       FROM stock_history sh
       JOIN medicines m ON sh.medicine_id = m.medicine_id
       JOIN users u ON sh.changed_by = u.user_id
       WHERE sh.medicine_id = :1
       ORDER BY sh.changed_at DESC`,
      [req.params.id],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
