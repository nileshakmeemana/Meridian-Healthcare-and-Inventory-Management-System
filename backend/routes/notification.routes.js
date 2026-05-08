const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/notification.controller");

router.get("/", authenticate, ctrl.getMyNotifications);
router.get("/unread-count", authenticate, ctrl.getUnreadCount);
router.put("/:id/read", authenticate, ctrl.markAsRead);
router.put("/read-all", authenticate, ctrl.markAllAsRead);
router.post(
  "/scan",
  authenticate,
  require("../middleware/auth.middleware").authorize("admin"),
  ctrl.scanNotifications,
);

module.exports = router;
