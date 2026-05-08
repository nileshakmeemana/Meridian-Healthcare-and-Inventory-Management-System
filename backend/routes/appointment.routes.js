// routes/appointment.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/appointment.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/", ctrl.getAppointments);
router.get(
  "/today",
  authorize("admin", "doctor", "pharmacist"),
  ctrl.getTodayAppointments,
);
router.get("/availability", ctrl.getDoctorAvailability);
router.post("/", authorize("admin", "patient", "doctor"), ctrl.bookAppointment);
router.patch(
  "/:id/status",
  authorize("admin", "doctor"),
  ctrl.updateAppointmentStatus,
);
router.patch(
  "/:id/cancel",
  authorize("admin", "doctor", "patient"),
  ctrl.cancelAppointment,
);

module.exports = router;
