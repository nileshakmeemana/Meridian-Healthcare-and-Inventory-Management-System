const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Pharmacist-specific sales endpoints
router.post('/sales', authenticate, authorize('pharmacist'), async (req, res) => {
  const db = require('../config/database');
  const { patient_id, items } = req.body;
  try {
    const saleId = await db.query(
      `INSERT INTO sales (sale_id, patient_id, pharmacist_id, sale_date, total_amount)
       VALUES (sale_seq.NEXTVAL, :pid, (SELECT pharmacist_id FROM pharmacists WHERE user_id = :uid), SYSDATE, 0)
       RETURNING sale_id INTO :sid`,
      { pid: patient_id, uid: req.user.userId, sid: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER } }
    );
    res.status(201).json({ success: true, message: 'Sale recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/sales', authenticate, authorize('pharmacist', 'admin'), async (req, res) => {
  const db = require('../config/database');
  try {
    const result = await db.query(`
      SELECT s.sale_id, s.sale_date, s.total_amount,
             u.full_name AS patient_name, up.full_name AS pharmacist_name
      FROM sales s
      LEFT JOIN patients p ON s.patient_id = p.patient_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN pharmacists ph ON s.pharmacist_id = ph.pharmacist_id
      LEFT JOIN users up ON ph.user_id = up.user_id
      ORDER BY s.sale_date DESC FETCH FIRST 100 ROWS ONLY
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
