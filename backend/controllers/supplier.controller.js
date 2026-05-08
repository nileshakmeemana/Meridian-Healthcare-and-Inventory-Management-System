const db = require("../config/database");

// Get all suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.user_id,
             u.username,
             u.email,
             u.is_active,
             s.supplier_id,
             s.company_name AS full_name,
             s.contact_person,
             s.phone,
             s.address,
             s.rating,
             (SELECT COUNT(*) FROM supply_orders so WHERE so.supplier_id = s.supplier_id) AS total_orders
      FROM users u JOIN suppliers s ON u.user_id = s.user_id
      ORDER BY s.company_name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get medicine requests (pending)
exports.getMedicineRequests = async (req, res) => {
  try {
    const supplierResult = await db.query(
      "SELECT supplier_id FROM suppliers WHERE user_id = :1",
      [req.user.userId],
    );
    const supplierId = supplierResult.rows[0]?.SUPPLIER_ID;

    const result = await db.query(
      `
      SELECT mr.request_id, mr.quantity_requested AS requested_quantity, mr.status, mr.created_at, mr.notes,
             m.name AS medicine_name, m.category, m.unit_price,
             u.username AS requested_by
      FROM medicine_requests mr
      LEFT JOIN medicines m ON mr.medicine_id = m.medicine_id
      JOIN users u ON mr.requested_by = u.user_id
      WHERE mr.supplier_id = :1 OR mr.supplier_id IS NULL
      ORDER BY mr.created_at DESC
    `,
      [supplierId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Accept / reject request
exports.updateRequestStatus = async (req, res) => {
  const { status } = req.body; // 'Accepted' | 'Rejected'
  try {
    await db.query(
      "UPDATE medicine_requests SET status = :1 WHERE request_id = :2",
      [status, req.params.id],
    );
    res.json({ success: true, message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create supply order (deliver medicines)
exports.createSupplyOrder = async (req, res) => {
  const {
    request_id,
    medicine_id,
    quantity,
    unit_cost,
    notes,
    batch_number,
    expiry_date,
    medicine_name,
    quantity_supplied,
    unit_price,
    supplier_id: bodySupplier,
  } = req.body;
  try {
    let resolvedMedicineId = medicine_id;
    if (!resolvedMedicineId && medicine_name) {
      const medicineResult = await db.query(
        "SELECT medicine_id FROM medicines WHERE UPPER(name) = UPPER(:1)",
        [medicine_name],
      );
      resolvedMedicineId = medicineResult.rows[0]?.MEDICINE_ID;
    }

    let supplierId = bodySupplier;
    if (!supplierId) {
      const supplierResult = await db.query(
        "SELECT supplier_id FROM suppliers WHERE user_id = :1",
        [req.user.userId],
      );
      supplierId = supplierResult.rows[0]?.SUPPLIER_ID;
    }

    const resolvedQuantity = quantity || quantity_supplied;
    const resolvedUnitCost = unit_cost || unit_price;
    const totalCost =
      Number(resolvedQuantity || 0) * Number(resolvedUnitCost || 0);

    if (!resolvedMedicineId) {
      return res
        .status(400)
        .json({ success: false, message: "Medicine is required" });
    }

    if (!supplierId) {
      return res
        .status(400)
        .json({ success: false, message: "Supplier is required" });
    }

    await db.query(
      `
      INSERT INTO supply_orders (request_id, supplier_id, medicine_id, quantity, unit_cost, total_cost, batch_number, expiry_date, supplied_date, status, notes)
      VALUES (:1, :2, :3, :4, :5, :6, :7, TO_DATE(:8, 'YYYY-MM-DD'), SYSDATE, 'Delivered', :9)
    `,
      [
        request_id || null,
        supplierId,
        resolvedMedicineId,
        resolvedQuantity,
        resolvedUnitCost,
        totalCost,
        batch_number || null,
        expiry_date || null,
        notes || null,
      ],
    );

    // Update medicine stock
    await db.query(
      `UPDATE medicines SET stock_quantity = stock_quantity + :1, updated_at = CURRENT_TIMESTAMP WHERE medicine_id = :2`,
      [resolvedQuantity, resolvedMedicineId],
    );

    // After updating stock, trigger low-stock notifications if needed
    try {
      const medRes = await db.query(
        `SELECT medicine_id FROM medicines WHERE medicine_id = :1`,
        [resolvedMedicineId],
      );
      if (medRes.rows[0]) {
        const medId = medRes.rows[0].MEDICINE_ID;
        // Reuse medicine controller helper by requiring it
        const medCtrl = require("./medicine.controller");
        if (typeof medCtrl.notifyLowStockIfNeeded === "function") {
          await medCtrl.notifyLowStockIfNeeded(medId);
        }
      }
    } catch (e) {
      console.error("notifyLowStockIfNeeded (supplier) error:", e.message || e);
    }

    if (request_id) {
      await db.query(
        "UPDATE medicine_requests SET status = :1 WHERE request_id = :2",
        ["Fulfilled", request_id],
      );
    }

    res.json({
      success: true,
      message: "Supply order created and stock updated",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get supply history
exports.getSupplyHistory = async (req, res) => {
  try {
    const supplierResult = await db.query(
      "SELECT supplier_id FROM suppliers WHERE user_id = :1",
      [req.user.userId],
    );
    const supplierId = supplierResult.rows[0]?.SUPPLIER_ID;

    const result = await db.query(
      `
      SELECT so.supply_id AS order_id, so.supplied_date AS order_date, so.quantity AS quantity_supplied, so.unit_cost,
             so.total_cost, so.status, so.notes,
             m.name AS medicine_name, m.category
      FROM supply_orders so
      JOIN medicines m ON so.medicine_id = m.medicine_id
      WHERE so.supplier_id = :1
      ORDER BY so.supplied_date DESC
    `,
      [supplierId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update supplier profile
exports.updateProfile = async (req, res) => {
  const { company_name, contact_person, address, phone } = req.body;
  try {
    await db.query(
      "UPDATE suppliers SET company_name = :1, contact_person = :2, address = :3, phone = :4 WHERE user_id = :5",
      [company_name, contact_person, address, phone, req.user.userId],
    );
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create supplier (creates user + supplier record)
exports.createSupplier = async (req, res) => {
  const bcrypt = require("bcryptjs");
  const { query } = require("../config/database");
  try {
    const { email, password, full_name, contact_person, phone, address } =
      req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "email, password, full_name required",
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
    const username = email.split("@")[0].toLowerCase().replace(/\.+/g, ".");

    // Create user
    await query(
      `INSERT INTO users (username, email, password_hash, role) VALUES (:1, :2, :3, :4)`,
      [username, email, hash, "supplier"],
    );

    // Get the created user_id
    const userRes = await query(`SELECT user_id FROM users WHERE email = :1`, [
      email,
    ]);
    const user_id = userRes.rows[0].USER_ID;

    // Create supplier record
    await query(
      `INSERT INTO suppliers (user_id, company_name, contact_person, phone, address)
       VALUES (:1, :2, :3, :4, :5)`,
      [
        user_id,
        full_name,
        contact_person || null,
        phone || null,
        address || null,
      ],
    );

    // Return the created supplier
    const newRes = await query(
      `SELECT u.user_id,
              u.username,
              u.email,
              u.is_active,
              s.supplier_id,
              s.company_name AS full_name,
              s.contact_person,
              s.phone,
              s.address,
              s.rating,
              (SELECT COUNT(*) FROM supply_orders so WHERE so.supplier_id = s.supplier_id) AS total_orders
       FROM users u JOIN suppliers s ON u.user_id = s.user_id
       WHERE u.email = :1`,
      [email],
    );
    res.status(201).json({ success: true, data: newRes.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update supplier (admin endpoint)
exports.updateSupplier = async (req, res) => {
  const { query } = require("../config/database");
  try {
    const { id } = req.params;
    const { full_name, contact_person, phone, address } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "supplier_id required" });
    }
    if (!full_name) {
      return res
        .status(400)
        .json({ success: false, message: "full_name required" });
    }
    await query(
      `UPDATE suppliers SET company_name = :1, contact_person = :2, phone = :3, address = :4 WHERE supplier_id = :5`,
      [full_name, contact_person || null, phone || null, address || null, id],
    );
    res.json({ success: true, message: "Supplier updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete supplier
exports.deleteSupplier = async (req, res) => {
  const { getConnection, queryNoCommit } = require("../config/database");
  let conn;
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "supplier_id required" });
    }

    conn = await getConnection();

    // Check for existing supply orders to avoid FK constraint issues
    const ordersRes = await queryNoCommit(
      conn,
      `SELECT COUNT(*) AS CNT FROM supply_orders WHERE supplier_id = :1`,
      [id],
    );
    const cnt = ordersRes.rows[0]?.CNT || 0;
    if (cnt > 0) {
      await conn.rollback().catch(() => {});
      await conn.close().catch(() => {});
      return res.status(400).json({
        success: false,
        message: "Cannot delete supplier with existing supply orders",
      });
    }

    // Get associated user_id
    const supRes = await queryNoCommit(
      conn,
      `SELECT user_id FROM suppliers WHERE supplier_id = :1`,
      [id],
    );
    const userId = supRes.rows[0]?.USER_ID;

    // Delete supplier record
    await queryNoCommit(conn, `DELETE FROM suppliers WHERE supplier_id = :1`, [
      id,
    ]);

    // Optionally delete user account if present
    if (userId) {
      await queryNoCommit(conn, `DELETE FROM users WHERE user_id = :1`, [
        userId,
      ]);
    }

    await conn.commit();
    await conn.close();

    res.json({ success: true, message: "Supplier deleted" });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(() => {});
      await conn.close().catch(() => {});
    }
    res.status(500).json({ success: false, message: err.message });
  }
};
