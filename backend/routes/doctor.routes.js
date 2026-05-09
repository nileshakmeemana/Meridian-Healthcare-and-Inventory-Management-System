const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/doctor.controller");

router.get(
  "/",
  authenticate,
  authorize("admin", "pharmacist", "patient", "doctor", "supplier"),
  ctrl.getAllDoctors,
);
router.get(
  "/schedule",
  authenticate,
  authorize("doctor"),
  ctrl.getDoctorSchedule,
);
router.get("/:id", authenticate, ctrl.getDoctorById);
router.get("/:id/schedule", authenticate, ctrl.getDoctorSchedule);
router.put(
  "/profile",
  authenticate,
  authorize("doctor"),
  ctrl.updateDoctorProfile,
);
router.post(
  "/diagnosis",
  authenticate,
  authorize("doctor"),
  ctrl.addDiagnosisNote,
);

module.exports = router;
