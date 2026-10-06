// Small helpers shared by every controller
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, ...(message && { message }), data });

const paginate = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

// Normalise "YYYY-MM-DD" (or a Date) to midnight UTC so day comparisons are stable
const toDay = (value = new Date()) => {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { asyncHandler, ok, paginate, toDay, escapeRegex };
