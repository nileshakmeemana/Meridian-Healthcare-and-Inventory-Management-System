// controllers/report.controller.js
const { query } = require("../config/database");

// GET dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const doctorId =
      req.user.role === "doctor"
        ? (
            await query(`SELECT doctor_id FROM doctors WHERE user_id = :1`, [
              req.user.userId,
            ])
          ).rows[0]?.DOCTOR_ID
        : null;
    const [patients, doctors, medicines, appointments, lowStock, revenue] =
      await Promise.all([
        doctorId
          ? query(
              `SELECT COUNT(DISTINCT a.patient_id) AS CNT FROM appointments a WHERE a.doctor_id = :1`,
              [doctorId],
            )
          : query(`SELECT COUNT(*) AS CNT FROM patients`),
        query(`SELECT COUNT(*) AS CNT FROM doctors`),
        query(`SELECT COUNT(*) AS CNT FROM medicines`),
        doctorId
          ? query(
              `SELECT COUNT(*) AS CNT FROM appointments WHERE doctor_id = :1 AND TRUNC(appointment_date) = TRUNC(SYSDATE)`,
              [doctorId],
            )
          : query(
              `SELECT COUNT(*) AS CNT FROM appointments WHERE TRUNC(appointment_date) = TRUNC(SYSDATE)`,
            ),
        query(
          `SELECT COUNT(*) AS CNT FROM medicines WHERE stock_quantity <= reorder_level`,
        ),
        query(
          `SELECT NVL(SUM(total_amount),0) AS TOTAL FROM sales WHERE TRUNC(sale_date) = TRUNC(SYSDATE)`,
        ),
      ]);
    res.json({
      success: true,
      data: {
        totalPatients: patients.rows[0].CNT,
        totalDoctors: doctors.rows[0].CNT,
        totalMedicines: medicines.rows[0].CNT,
        todayAppointments: appointments.rows[0].CNT,
        lowStockCount: lowStock.rows[0].CNT,
        todayRevenue: revenue.rows[0].TOTAL,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET most used medicines (BI)
exports.getMostUsedMedicines = async (req, res) => {
  try {
    const topN = Math.max(1, Math.min(Number(req.query.topN) || 10, 50));
    const { startDate, endDate } = req.query;

    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate. Use YYYY-MM-DD format.",
      });
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid endDate. Use YYYY-MM-DD format.",
      });
    }

    const binds = [];
    let bindIndex = 1;
    let dateFilterSql = "";

    const doctorId =
      req.user.role === "doctor"
        ? (
            await query(`SELECT doctor_id FROM doctors WHERE user_id = :1`, [
              req.user.userId,
            ])
          ).rows[0]?.DOCTOR_ID
        : null;

    if (startDate) {
      dateFilterSql += `AND pr.issued_date >= TO_DATE(:${bindIndex}, 'YYYY-MM-DD') `;
      binds.push(startDate);
      bindIndex++;
    }
    if (endDate) {
      dateFilterSql += `AND pr.issued_date < TO_DATE(:${bindIndex}, 'YYYY-MM-DD') + 1 `;
      binds.push(endDate);
      bindIndex++;
    }

    if (doctorId) {
      dateFilterSql += `AND pr.doctor_id = :${bindIndex} `;
      binds.push(doctorId);
      bindIndex++;
    }

    const sql = `
      SELECT m.medicine_id, m.name AS medicine_name, m.category,
             NVL(SUM(pi.quantity), 0) AS total_prescribed,
             COUNT(pi.item_id) AS prescription_count,
             COUNT(DISTINCT pr.patient_id) AS unique_patients,
             NVL(SUM(pi.quantity * m.unit_price), 0) AS estimated_revenue,
             RANK() OVER (ORDER BY NVL(SUM(pi.quantity), 0) DESC) AS medicine_rank
      FROM medicines m
      LEFT JOIN prescription_items pi ON m.medicine_id = pi.medicine_id
      LEFT JOIN prescriptions pr ON pi.prescription_id = pr.prescription_id
        AND pr.status IN ('Active','Fulfilled','Completed')
        ${dateFilterSql}
      GROUP BY m.medicine_id, m.name, m.category
      ORDER BY total_prescribed DESC
      FETCH FIRST ${topN} ROWS ONLY
    `;

    const result = await query(sql, binds);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getMostUsedMedicines error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET stock report
exports.getStockReport = async (req, res) => {
  try {
    const result = await query(`
      SELECT medicine_id, name, category, stock_quantity, reorder_level, expiry_date, unit_price,
             CASE
               WHEN expiry_date < SYSDATE THEN 'Expired'
               WHEN stock_quantity = 0 THEN 'Critical'
               WHEN stock_quantity <= reorder_level THEN 'Low'
               ELSE 'Normal'
             END AS stock_status
      FROM medicines
      ORDER BY stock_quantity ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET daily revenue
exports.getDailyRevenue = async (req, res) => {
  try {
    const result = await query(`
      SELECT TRUNC(sale_date) AS sale_day,
             COUNT(*) AS total_sales,
             NVL(SUM(total_amount), 0) AS revenue
      FROM sales
      WHERE sale_date >= SYSDATE - 14
      GROUP BY TRUNC(sale_date)
      ORDER BY sale_day
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET appointment stats
exports.getAppointmentStats = async (req, res) => {
  try {
    const doctorId =
      req.user.role === "doctor"
        ? (
            await query(`SELECT doctor_id FROM doctors WHERE user_id = :1`, [
              req.user.userId,
            ])
          ).rows[0]?.DOCTOR_ID
        : null;
    let sql = `
      SELECT TRUNC(appointment_date,'MM') AS month,
             status,
             COUNT(*) AS total
      FROM appointments
      WHERE appointment_date >= ADD_MONTHS(SYSDATE, -6)`;

    const binds = [];
    if (doctorId) {
      sql += ` AND doctor_id = :1`;
      binds.push(doctorId);
    }
    sql += ` GROUP BY TRUNC(appointment_date,'MM'), status ORDER BY month, status`;

    const result = await query(sql, binds);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET supplier performance
exports.getSupplierPerformance = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.supplier_id, s.company_name,
             COUNT(so.supply_id) AS total_orders,
             NVL(SUM(so.total_cost), 0) AS total_value,
             NVL(AVG(so.total_cost), 0) AS avg_order_value,
             s.rating
      FROM suppliers s
      LEFT JOIN supply_orders so ON s.supplier_id = so.supplier_id
      GROUP BY s.supplier_id, s.company_name, s.rating
      ORDER BY total_orders DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
