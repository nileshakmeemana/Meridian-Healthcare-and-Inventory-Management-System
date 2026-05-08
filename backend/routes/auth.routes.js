// routes/auth.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/login',           ctrl.login);
router.post('/register',        ctrl.register);
router.post('/change-password', authenticate, ctrl.changePassword);
router.get('/me',               authenticate, ctrl.getMe);

module.exports = router;
