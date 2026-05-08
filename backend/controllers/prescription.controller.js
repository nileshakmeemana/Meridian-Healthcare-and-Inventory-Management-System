const db = require("../config/database");

const resolveDoctorId = async (userId) => {
  const result = await db.query(
    "SELECT doctor_id FROM doctors WHERE user_id = :1",
    [userId],
  );
  return result.rows[0]?.DOCTOR_ID || null;
};

const resolvePatientId = async (userId) => {
  const result = await db.query(
    "SELECT patient_id FROM patients WHERE user_id = :1",
    [userId],
  );
  return result.rows[0]?.PATIENT_ID || null;
};

const resolvePrescriptionDoctorId = async (prescriptionId) => {
  const result = await db.query(
    "SELECT doctor_id FROM prescriptions WHERE prescription_id = :1",
    [prescriptionId],
  );
  return result.rows[0]?.DOCTOR_ID || null;
};

// Create prescription (doctor)
exports.createPrescription = async (req, res) => {
  const { patient_id, appointment_id, notes, items, diagnosis } = req.body;
  try {
    const doctorResult = await db.query(
      "SELECT doctor_id FROM doctors WHERE user_id = :1",
      [req.user.userId],
    );
    const doctorId = doctorResult.rows[0]?.DOCTOR_ID;
    if (!doctorId) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    let resolvedAppointmentId = appointment_id;
    if (!resolvedAppointmentId) {
      const apptResult = await db.query(
        `SELECT appointment_id
         FROM appointments
         WHERE patient_id = :1 AND doctor_id = :2
         ORDER BY appointment_date DESC, appointment_time DESC
         FETCH FIRST 1 ROWS ONLY`,
        [patient_id, doctorId],
      );
      resolvedAppointmentId = apptResult.rows[0]?.APPOINTMENT_ID;
    }

    if (!resolvedAppointmentId) {
      return res.status(400).json({
        success: false,
        message: "An appointment is required to create a prescription",
      });
    }

    const conn = await db.getConnection();
    try {
      const prescResult = await conn.execute(
        `INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, diagnosis, notes, valid_until, status)
         VALUES (:1, :2, :3, :4, :5, SYSDATE + 30, 'Active')
         RETURNING prescription_id INTO :6`,
        {
          1: resolvedAppointmentId,
          2: patient_id,
          3: doctorId,
          4: diagnosis || notes || "Prescription",
          5: notes || null,
          6: { dir: db.oracledb.BIND_OUT, type: db.oracledb.NUMBER },
        },
      );
      const prescId = prescResult.outBinds[6][0];

      for (const item of items || []) {
        await conn.execute(
          `INSERT INTO prescription_items (item_id, prescription_id, medicine_id, quantity, dosage, frequency, duration_days, instructions)
           VALUES (seq_presc_items.NEXTVAL, :1, :2, :3, :4, :5, :6, :7)`,
          [
            prescId,
            item.medicine_id,
            Number(item.quantity) || 1,
            item.dosage || null,
            item.frequency || null,
            Number(item.duration) || null,
            item.instructions || null,
          ],
        );
      }

      await conn.commit();
      // Create notifications: notify patient and pharmacists
      try {
        const patientUserRes = await conn.execute(
          `SELECT user_id FROM patients WHERE patient_id = :1`,
          [patient_id],
        );
        const patientUserId = patientUserRes.rows[0]?.USER_ID;

        const doctorNameRes = await conn.execute(
          `SELECT first_name || ' ' || last_name AS name FROM doctors WHERE doctor_id = :1`,
          [doctorId],
        );
        const doctorName = doctorNameRes.rows[0]?.NAME || "Doctor";

        if (patientUserId) {
          await conn.execute(
            `INSERT INTO notifications (notification_id, user_id, title, message, type)
             VALUES (seq_notifications.NEXTVAL, :1, :2, :3, 'Prescription')`,
            [
              patientUserId,
              "New Prescription",
              `Dr. ${doctorName} issued a prescription on ${new Date().toISOString().split("T")[0]}`,
            ],
          );
        }

        const pharmacistsRes = await conn.execute(
          `SELECT u.user_id FROM users u JOIN pharmacists p ON p.user_id = u.user_id WHERE u.is_active = 1`,
          [],
        );
        for (const ph of pharmacistsRes.rows) {
          await conn.execute(
            `INSERT INTO notifications (notification_id, user_id, title, message, type)
             VALUES (seq_notifications.NEXTVAL, :1, :2, :3, 'Prescription')`,
            [
              ph.USER_ID,
              "Prescription Awaiting Fulfillment",
              `New prescription (${prescId}) for patient ID ${patient_id}`,
            ],
          );
        }
      } catch (e) {
        console.error("Prescription notification error:", e.message || e);
      }

      res.status(201).json({
        success: true,
        message: "Prescription created",
        prescriptionId: prescId,
      });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update prescription (doctor)
exports.updatePrescription = async (req, res) => {
  const { diagnosis, notes, valid_until, status, items } = req.body;
  const prescriptionId = req.params.id;

  try {
    const doctorId = await resolveDoctorId(req.user.userId);
    if (!doctorId) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    const ownerDoctorId = await resolvePrescriptionDoctorId(prescriptionId);
    if (!ownerDoctorId) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }

    if (Number(ownerDoctorId) !== Number(doctorId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const conn = await db.getConnection();
    try {
      const currentItemsResult = await conn.execute(
        `SELECT medicine_id, quantity, dosage, frequency, duration_days, instructions
         FROM prescription_items
         WHERE prescription_id = :1`,
        [prescriptionId],
      );

      const validItems = (items || [])
        .map((item) => ({
          medicine_id: Number(item.medicine_id),
          quantity: Number(item.quantity) || 1,
          dosage: item.dosage || null,
          frequency: item.frequency || null,
          duration: Number(item.duration) || null,
          instructions: item.instructions || null,
        }))
        .filter(
          (item) => Number.isFinite(item.medicine_id) && item.medicine_id > 0,
        );

      const itemsToSave = validItems.length
        ? validItems
        : currentItemsResult.rows.map((item) => ({
            medicine_id: Number(item.MEDICINE_ID),
            quantity: Number(item.QUANTITY) || 1,
            dosage: item.DOSAGE || null,
            frequency: item.FREQUENCY || null,
            duration: Number(item.DURATION_DAYS) || null,
            instructions: item.INSTRUCTIONS || null,
          }));

      const updateSql = [];
      const updateBinds = [];

      updateSql.push("diagnosis = :1");
      updateBinds.push(diagnosis || "Prescription");

      updateSql.push("notes = :2");
      updateBinds.push(notes || null);

      if (valid_until) {
        updateSql.push("valid_until = TO_DATE(:3, 'YYYY-MM-DD')");
        updateBinds.push(valid_until);
      }

      if (status) {
        updateSql.push(`status = :${updateBinds.length + 1}`);
        updateBinds.push(status);
      }

      updateBinds.push(prescriptionId);

      await conn.execute(
        `UPDATE prescriptions
         SET ${updateSql.join(", ")}
         WHERE prescription_id = :${updateBinds.length}`,
        updateBinds,
      );

      await conn.execute(
        "DELETE FROM prescription_items WHERE prescription_id = :1",
        [prescriptionId],
      );

      for (const item of itemsToSave) {
        await conn.execute(
          `INSERT INTO prescription_items (item_id, prescription_id, medicine_id, quantity, dosage, frequency, duration_days, instructions)
           VALUES (seq_presc_items.NEXTVAL, :1, :2, :3, :4, :5, :6, :7)`,
          [
            prescriptionId,
            item.medicine_id,
            item.quantity,
            item.dosage,
            item.frequency,
            item.duration,
            item.instructions,
          ],
        );
      }

      await conn.commit();
      res.json({ success: true, message: "Prescription updated" });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete prescription (doctor)
exports.deletePrescription = async (req, res) => {
  const prescriptionId = req.params.id;

  try {
    const doctorId = await resolveDoctorId(req.user.userId);
    if (!doctorId) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    const ownerDoctorId = await resolvePrescriptionDoctorId(prescriptionId);
    if (!ownerDoctorId) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }

    if (Number(ownerDoctorId) !== Number(doctorId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const conn = await db.getConnection();
    try {
      await conn.execute(
        "DELETE FROM prescription_items WHERE prescription_id = :1",
        [prescriptionId],
      );
      await conn.execute(
        "DELETE FROM prescriptions WHERE prescription_id = :1",
        [prescriptionId],
      );
      await conn.commit();
      res.json({ success: true, message: "Prescription deleted" });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark prescription as completed (pharmacist)
exports.completePrescription = async (req, res) => {
  const prescriptionId = req.params.id;

  try {
    const conn = await db.getConnection();
    try {
      const prescriptionResult = await conn.execute(
        "SELECT prescription_id, status FROM prescriptions WHERE prescription_id = :1",
        [prescriptionId],
      );
      const prescription = prescriptionResult.rows[0];

      if (!prescription) {
        return res
          .status(404)
          .json({ success: false, message: "Prescription not found" });
      }

      if (String(prescription.STATUS).toLowerCase() === "completed") {
        return res.status(400).json({
          success: false,
          message: "Prescription is already completed",
        });
      }

      const itemsResult = await conn.execute(
        `SELECT medicine_id, NVL(SUM(quantity), 0) AS issued_quantity
         FROM prescription_items
         WHERE prescription_id = :1
         GROUP BY medicine_id`,
        [prescriptionId],
      );

      const deductedMedicineIds = [];

      for (const item of itemsResult.rows) {
        const medicineId = Number(item.MEDICINE_ID);
        const issuedQuantity = Number(item.ISSUED_QUANTITY) || 0;

        if (!medicineId || issuedQuantity <= 0) {
          continue;
        }

        const medicineResult = await conn.execute(
          `SELECT medicine_id, name, stock_quantity
           FROM medicines
           WHERE medicine_id = :1
           FOR UPDATE`,
          [medicineId],
        );
        const medicine = medicineResult.rows[0];

        if (!medicine) {
          return res.status(400).json({
            success: false,
            message: `Medicine ${medicineId} in prescription is not available`,
          });
        }

        const currentStock = Number(medicine.STOCK_QUANTITY) || 0;
        if (currentStock < issuedQuantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${medicine.NAME} (required: ${issuedQuantity}, available: ${currentStock})`,
          });
        }

        const newStock = currentStock - issuedQuantity;

        await conn.execute(
          `UPDATE medicines
           SET stock_quantity = :1
           WHERE medicine_id = :2`,
          [newStock, medicineId],
        );

        await conn.execute(
          `INSERT INTO stock_history (history_id, medicine_id, changed_by, change_type, quantity_before, quantity_change, quantity_after, reason)
           VALUES (seq_stock_hist.NEXTVAL, :1, :2, 'Remove', :3, :4, :5, :6)`,
          [
            medicineId,
            req.user.userId,
            currentStock,
            -issuedQuantity,
            newStock,
            `Prescription ${prescriptionId} completed`,
          ],
        );

        deductedMedicineIds.push(medicineId);
      }

      await conn.execute(
        "UPDATE prescriptions SET status = 'Completed' WHERE prescription_id = :1",
        [prescriptionId],
      );
      // Notify patient and doctor about completion
      try {
        const headerRes = await conn.execute(
          `SELECT patient_id, doctor_id FROM prescriptions WHERE prescription_id = :1`,
          [prescriptionId],
        );
        const patientId = headerRes.rows[0]?.PATIENT_ID;
        const doctorId = headerRes.rows[0]?.DOCTOR_ID;

        const patientUserRes = patientId
          ? await conn.execute(
              `SELECT user_id FROM patients WHERE patient_id = :1`,
              [patientId],
            )
          : null;
        const patientUserId = patientUserRes?.rows[0]?.USER_ID;

        const doctorUserRes = doctorId
          ? await conn.execute(
              `SELECT user_id FROM doctors d JOIN users u ON d.user_id = u.user_id WHERE d.doctor_id = :1`,
              [doctorId],
            )
          : null;
        const doctorUserId = doctorUserRes?.rows[0]?.USER_ID;

        if (patientUserId) {
          await conn.execute(
            `INSERT INTO notifications (notification_id, user_id, title, message, type)
             VALUES (seq_notifications.NEXTVAL, :1, :2, :3, 'Prescription')`,
            [
              patientUserId,
              "Prescription Completed",
              `Your prescription (${prescriptionId}) has been marked as completed.`,
            ],
          );
        }

        if (doctorUserId) {
          await conn.execute(
            `INSERT INTO notifications (notification_id, user_id, title, message, type)
             VALUES (seq_notifications.NEXTVAL, :1, :2, :3, 'Prescription')`,
            [
              doctorUserId,
              "Prescription Fulfilled",
              `Prescription (${prescriptionId}) has been completed by pharmacy.`,
            ],
          );
        }
      } catch (e) {
        console.error(
          "Complete prescription notification error:",
          e.message || e,
        );
      }

      await conn.commit();

      // After commit, trigger low-stock notifications for any deducted medicine.
      const { notifyLowStockIfNeeded } = require("./medicine.controller");
      const uniqueMedicineIds = [...new Set(deductedMedicineIds)];
      for (const medicineId of uniqueMedicineIds) {
        try {
          await notifyLowStockIfNeeded(medicineId);
        } catch (e) {
          console.error(
            "Low stock notification error after prescription completion:",
            e.message || e,
          );
        }
      }

      res.json({ success: true, message: "Prescription marked as completed" });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all prescriptions (filtered by role)
exports.getPrescriptions = async (req, res) => {
  try {
    let sql = `
      SELECT pr.prescription_id, pr.created_at, pr.issued_date, pr.valid_until,
             pr.status, pr.diagnosis, pr.notes,
             p.first_name || ' ' || p.last_name AS patient_name,
             d.first_name || ' ' || d.last_name AS doctor_name,
             d.specialization,
             COUNT(pi.item_id) AS item_count,
             NVL(SUM(pi.quantity), 0) AS total_quantity
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.patient_id
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
    `;
    const params = [];

    if (req.user.role === "doctor") {
      const drResult = await db.query(
        "SELECT doctor_id FROM doctors WHERE user_id = :1",
        [req.user.userId],
      );
      sql += " WHERE pr.doctor_id = :1";
      params.push(drResult.rows[0]?.DOCTOR_ID);
    } else if (req.user.role === "patient") {
      const ptResult = await db.query(
        "SELECT patient_id FROM patients WHERE user_id = :1",
        [req.user.userId],
      );
      sql += " WHERE pr.patient_id = :1";
      params.push(ptResult.rows[0]?.PATIENT_ID);
    }

    sql +=
      " GROUP BY pr.prescription_id, pr.created_at, pr.issued_date, pr.valid_until, pr.status, pr.diagnosis, pr.notes, p.first_name, p.last_name, d.first_name, d.last_name, d.specialization ORDER BY pr.created_at DESC";
    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get prescription detail
exports.getPrescriptionById = async (req, res) => {
  try {
    const headerResult = await db.query(
      `
      SELECT pr.prescription_id, pr.created_at, pr.issued_date, pr.valid_until,
             pr.status, pr.diagnosis, pr.notes,
             pr.patient_id, pr.doctor_id,
             p.first_name || ' ' || p.last_name AS patient_name,
             d.first_name || ' ' || d.last_name AS doctor_name, d.specialization
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.patient_id
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      WHERE pr.prescription_id = :1
    `,
      [req.params.id],
    );
    const headerRow = headerResult.rows[0];
    if (!headerRow) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }

    if (req.user.role === "doctor") {
      const doctorId = await resolveDoctorId(req.user.userId);
      if (!doctorId || Number(headerRow.DOCTOR_ID) !== Number(doctorId)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    } else if (req.user.role === "patient") {
      const patientId = await resolvePatientId(req.user.userId);
      if (!patientId || Number(headerRow.PATIENT_ID) !== Number(patientId)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    }

    const items = await db.query(
      `
      SELECT pi.item_id, pi.medicine_id, pi.quantity, pi.dosage, pi.frequency, pi.duration_days, pi.instructions,
             m.name AS medicine_name, m.category, m.unit_price
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pi.prescription_id = :1
    `,
      [req.params.id],
    );
    res.json({ success: true, data: { ...headerRow, items: items.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
