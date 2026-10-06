const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');

const auth = require('../controllers/auth.controller');
const admin = require('../controllers/admin.controller');
const people = require('../controllers/people.controller');
const appt = require('../controllers/appointment.controller');
const rx = require('../controllers/prescription.controller');
const med = require('../controllers/medicine.controller');
const sale = require('../controllers/sale.controller');
const supply = require('../controllers/supply.controller');
const notif = require('../controllers/notification.controller');
const report = require('../controllers/report.controller');

const STAFF = ['admin', 'doctor', 'pharmacist'];
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Try again in 15 minutes.' } });

/* Auth ------------------------------------------------------------- */
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/register', authLimiter, auth.register);
router.get('/auth/me', authenticate, auth.me);
router.put('/auth/profile', authenticate, auth.updateProfile);
router.post('/auth/change-password', authenticate, auth.changePassword);

/* Everything below requires a valid token -------------------------- */
router.use(authenticate);

/* Admin: user & role management */
router.get('/admin/users', authorize('admin'), admin.listUsers);
router.post('/admin/users', authorize('admin'), admin.createUser);
router.put('/admin/users/:id', authorize('admin'), admin.updateUser);
router.patch('/admin/users/:id/toggle', authorize('admin'), admin.toggleActive);
router.patch('/admin/users/:id/role', authorize('admin'), admin.changeRole);
router.delete('/admin/users/:id', authorize('admin'), admin.deleteUser);
router.get('/admin/audit-logs', authorize('admin'), admin.auditLogs);

/* People */
router.get('/patients', authorize('admin', 'doctor', 'pharmacist'), people.listPatients);
router.get('/patients/:id', people.getPatient);
router.get('/doctors', people.listDoctors);
router.get('/doctors/:id', people.getDoctor);
router.get('/suppliers', authorize('admin', 'pharmacist'), people.listSuppliers);

/* Appointments */
router.get('/appointments', appt.list);
router.get('/appointments/today', authorize(...STAFF), appt.today);
router.get('/appointments/availability', appt.availability);
router.post('/appointments', authorize('admin', 'patient', 'doctor'), appt.book);
router.patch('/appointments/:id/status', appt.updateStatus);
router.patch('/appointments/:id/notes', authorize('doctor'), appt.saveNotes);

/* Prescriptions */
router.get('/prescriptions', rx.list);
router.get('/prescriptions/:id', rx.get);
router.post('/prescriptions', authorize('doctor'), rx.create);

/* Medicines & inventory */
router.get('/medicines', authorize(...STAFF, 'supplier'), med.list); // suppliers pick what they ship
router.get('/medicines/alerts', authorize(...STAFF), med.alerts);
router.get('/medicines/categories', authorize(...STAFF), med.categories);
router.get('/medicines/movements', authorize('admin', 'pharmacist'), med.movements);
router.get('/medicines/:id', authorize(...STAFF, 'supplier'), med.get);
router.get('/medicines/:id/history', authorize('admin', 'pharmacist'), med.history);
router.post('/medicines', authorize('admin', 'pharmacist'), med.create);
router.put('/medicines/:id', authorize('admin', 'pharmacist'), med.update);
router.patch('/medicines/:id/stock', authorize('admin', 'pharmacist'), med.adjustStock);
router.delete('/medicines/:id', authorize('admin'), med.remove);

/* Sales (issue medicine to patients) */
router.get('/sales', authorize('admin', 'pharmacist'), sale.list);
router.post('/sales', authorize('pharmacist'), sale.create);

/* Requests & supply chain */
router.get('/requests', authorize('admin', 'doctor', 'pharmacist', 'supplier'), supply.listRequests);
router.post('/requests', authorize('doctor', 'pharmacist'), supply.createRequest);
router.patch('/requests/:id/respond', authorize('admin', 'pharmacist', 'supplier'), supply.respond);
router.get('/supply-orders', authorize('admin', 'pharmacist', 'supplier'), supply.listOrders);
router.post('/supply-orders', authorize('supplier'), supply.createOrder);
router.patch('/supply-orders/:id/status', authorize('admin', 'pharmacist', 'supplier'), supply.updateOrderStatus);

/* Notifications */
router.get('/notifications', notif.list);
router.patch('/notifications/read-all', notif.markAllRead);
router.patch('/notifications/:id/read', notif.markRead);

/* Reports & BI */
router.get('/reports/home', report.home);
router.get('/reports/dashboard', authorize(...STAFF), report.dashboardStats);
router.get('/reports/most-used', authorize(...STAFF), report.mostUsed);
router.get('/reports/most-used/all-time', authorize(...STAFF), report.mostUsedAllTime);
router.get('/reports/stock', authorize('admin', 'pharmacist'), report.stockReport);
router.get('/reports/suppliers', authorize('admin', 'pharmacist'), report.supplierPerformance);
router.get('/reports/revenue', authorize('admin', 'pharmacist'), report.revenue);
router.get('/reports/appointments', authorize('admin', 'doctor'), report.appointmentStats);
router.get('/reports/daily-patients', authorize('admin', 'doctor'), report.dailyPatients);
router.get('/reports/consumption', authorize('admin', 'pharmacist'), report.consumption);
router.get('/reports/forecast', authorize('admin', 'pharmacist'), report.forecast);
router.get('/reports/basket', authorize(...STAFF), report.basket);
router.get('/reports/abc', authorize('admin', 'pharmacist'), report.abc);

module.exports = router;
