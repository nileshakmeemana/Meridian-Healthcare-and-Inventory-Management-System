const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/supplier.controller");

// Allow any authenticated user to list suppliers for dashboard dropdowns/listings
router.get("/", authenticate, ctrl.getAllSuppliers);
router.get(
  "/requests",
  authenticate,
  authorize("supplier"),
  ctrl.getMedicineRequests,
);
router.put(
  "/requests/:id",
  authenticate,
  authorize("supplier"),
  ctrl.updateRequestStatus,
);
router.post(
  "/supply-orders",
  authenticate,
  authorize("supplier"),
  ctrl.createSupplyOrder,
);

// Admin route for recording supply orders with automatic stock update
router.post(
  "/supply-orders/admin",
  authenticate,
  authorize("admin"),
  ctrl.createSupplyOrder,
);

// Supply history: allow supplier, pharmacist and admin to view supplier order history
router.get(
  "/supply-history",
  authenticate,
  authorize("admin", "pharmacist", "supplier"),
  ctrl.getSupplyHistory,
);
router.put("/profile", authenticate, authorize("supplier"), ctrl.updateProfile);

// Admin routes for creating, updating and deleting suppliers
router.post("/", authenticate, authorize("admin"), ctrl.createSupplier);
router.put("/:id", authenticate, authorize("admin"), ctrl.updateSupplier);
router.delete("/:id", authenticate, authorize("admin"), ctrl.deleteSupplier);

module.exports = router;
