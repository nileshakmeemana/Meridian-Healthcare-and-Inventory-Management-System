const { query } = require("../config/database");

// Get notifications for current user
exports.getMyNotifications = async (req, res) => {
  try {
    const result = await query(
      `
      SELECT notification_id, title, message, is_read, created_at, type
      FROM notifications
      WHERE user_id = :1 AND type IN ('Appointment','Prescription')
      ORDER BY created_at DESC
      FETCH FIRST 50 ROWS ONLY
    `,
      [req.user.userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    await query(
      "UPDATE notifications SET is_read = 1 WHERE notification_id = :1 AND user_id = :2",
      [req.params.id, req.user.userId],
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    await query("UPDATE notifications SET is_read = 1 WHERE user_id = :1", [
      req.user.userId,
    ]);
    res.json({ success: true, message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const result = await query(
      "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = :1 AND is_read = 0",
      [req.user.userId],
    );
    res.json({ success: true, count: result.rows[0]?.CNT || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: scan medicines and create missing low-stock / expiry notifications
exports.scanNotifications = async (req, res) => {
  try {
    const medCtrl = require("./medicine.controller");
    const meds = await query(
      `SELECT medicine_id FROM medicines WHERE stock_quantity <= reorder_level OR (expiry_date IS NOT NULL AND expiry_date <= SYSDATE + 30)`,
    );
    for (const m of meds.rows) {
      try {
        if (typeof medCtrl.notifyLowStockIfNeeded === "function") {
          await medCtrl.notifyLowStockIfNeeded(m.MEDICINE_ID);
        }
        if (typeof medCtrl.notifyExpiryIfNeeded === "function") {
          await medCtrl.notifyExpiryIfNeeded(m.MEDICINE_ID);
        }
      } catch (e) {
        console.error("scanNotifications inner error:", e.message || e);
      }
    }
    res.json({
      success: true,
      message: "Scan completed",
      scanned: meds.rows.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
