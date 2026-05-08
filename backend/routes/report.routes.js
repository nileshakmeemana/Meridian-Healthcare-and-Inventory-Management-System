// routes/report.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/report.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// Reports endpoints require authentication. Individual routes that need stricter
// role access (e.g. detailed revenue) will use `authorize(...)` explicitly.
router.use(authenticate);

router.get("/dashboard", ctrl.getDashboardStats);
router.get("/most-used-medicines", ctrl.getMostUsedMedicines);
router.get("/stock", ctrl.getStockReport);
router.get("/suppliers", ctrl.getSupplierPerformance);
// Keep detailed revenue restricted to admin only
router.get("/revenue", authorize("admin"), ctrl.getDailyRevenue);
router.get("/appointments", ctrl.getAppointmentStats);

module.exports = router;

// ── Stub routes (controllers to be added similarly) ──────────────────────────

// routes/admin.routes.js
const adminRouter = require("express").Router();
const {
  authenticate: authA,
  authorize: authzA,
} = require("../middleware/auth.middleware");
const { query } = require("../config/database");

adminRouter.use(authA, authzA("admin"));

adminRouter.get("/users", async (req, res) => {
  try {
    const result = await query(
      `SELECT user_id, username, email, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: "Failed" });
  }
});

adminRouter.patch("/users/:id/toggle", async (req, res) => {
  try {
    await query(
      `UPDATE users SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE user_id = :id`,
      { id: req.params.id },
    );
    res.json({ success: true, message: "User status toggled" });
  } catch {
    res.status(500).json({ success: false, message: "Failed" });
  }
});

adminRouter.delete("/users/:id", async (req, res) => {
  try {
    await query(`DELETE FROM users WHERE user_id = :id AND role != 'admin'`, {
      id: req.params.id,
    });
    res.json({ success: true, message: "User deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Failed" });
  }
});

module.exports.adminRouter = adminRouter;
