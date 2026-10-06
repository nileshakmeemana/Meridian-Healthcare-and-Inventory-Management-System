const { Notification } = require('../models');
const { asyncHandler, ok } = require('../utils/http');

exports.list = asyncHandler(async (req, res) => {
  const filter = { user: req.user.id };
  if (req.query.unread === 'true') filter.isRead = false;
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(Number(req.query.limit) || 50).lean(),
    Notification.countDocuments({ user: req.user.id, isRead: false }),
  ]);
  ok(res, { items, unread });
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { $set: { isRead: true } });
  ok(res, null, 'Marked as read');
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ user: req.user.id, isRead: false }, { $set: { isRead: true } });
  ok(res, { updated: r.modifiedCount }, 'All caught up');
});
