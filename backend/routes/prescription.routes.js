const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/prescription.controller");

router.get("/", authenticate, ctrl.getPrescriptions);
router.post("/", authenticate, authorize("doctor"), ctrl.createPrescription);
router.put("/:id", authenticate, authorize("doctor"), ctrl.updatePrescription);
router.patch(
  "/:id/complete",
  authenticate,
  authorize("pharmacist"),
  ctrl.completePrescription,
);
router.delete(
  "/:id",
  authenticate,
  authorize("doctor"),
  ctrl.deletePrescription,
);
router.get("/:id", authenticate, ctrl.getPrescriptionById);

module.exports = router;
