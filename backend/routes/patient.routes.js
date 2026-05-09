const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/patient.controller');

router.get('/', authenticate, authorize('admin', 'doctor', 'pharmacist', 'supplier', 'patient'), ctrl.getAllPatients);
router.get('/me', authenticate, authorize('patient'), ctrl.getMyProfile);
router.get('/prescriptions', authenticate, authorize('patient'), ctrl.getMyPrescriptions);
router.put('/me', authenticate, authorize('patient'), ctrl.updateProfile);
router.get('/:id', authenticate, ctrl.getPatientById);
router.get('/:id/history', authenticate, ctrl.getMedicalHistory);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deletePatient);

module.exports = router;
