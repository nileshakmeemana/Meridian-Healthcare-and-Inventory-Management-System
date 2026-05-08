-- ============================================================
-- MERIDIAN - Oracle PL/SQL Database Views
-- ============================================================

-- ============================================================
-- VIEW 1: vw_doctor_schedule_today
-- Shows all appointments for today with doctor & patient details
-- ============================================================
CREATE OR REPLACE VIEW vw_doctor_schedule_today AS
SELECT
    a.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.reason,
    a.notes,
    -- Doctor info
    d.doctor_id,
    d.first_name || ' ' || d.last_name          AS doctor_name,
    d.specialization                              AS doctor_specialization,
    -- Patient info
    p.patient_id,
    p.first_name || ' ' || p.last_name          AS patient_name,
    p.date_of_birth,
    fn_get_patient_age(p.patient_id)            AS patient_age,
    p.blood_group,
    p.phone                                      AS patient_phone,
    -- Prescription exists?
    (SELECT COUNT(*) FROM prescriptions pr
     WHERE pr.appointment_id = a.appointment_id) AS has_prescription
FROM
    appointments a
    JOIN doctors  d ON d.doctor_id  = a.doctor_id
    JOIN patients p ON p.patient_id = a.patient_id
WHERE
    a.appointment_date = TRUNC(SYSDATE)
ORDER BY
    a.appointment_time, d.doctor_id;

-- ============================================================
-- VIEW 2: vw_medicine_stock_report
-- Comprehensive medicine inventory view with status & analytics
-- ============================================================
CREATE OR REPLACE VIEW vw_medicine_stock_report AS
SELECT
    m.medicine_id,
    m.name                                          AS medicine_name,
    m.generic_name,
    m.category,
    m.manufacturer,
    m.unit_price,
    m.stock_quantity,
    m.reorder_level,
    m.expiry_date,
    m.dosage_form,
    m.strength,
    m.requires_prescription,
    -- Computed status
    fn_get_medicine_stock_status(m.medicine_id)    AS stock_status,
    -- Days until expiry
    CASE
        WHEN m.expiry_date IS NULL THEN NULL
        ELSE TRUNC(m.expiry_date - SYSDATE)
    END                                             AS days_until_expiry,
    -- Stock value
    m.stock_quantity * m.unit_price                AS stock_value,
    -- Total sold (last 30 days)
    (SELECT NVL(SUM(si.quantity), 0)
     FROM   sale_items si
     JOIN   sales s ON s.sale_id = si.sale_id
     WHERE  si.medicine_id = m.medicine_id
     AND    s.sale_date >= SYSDATE - 30)           AS sold_last_30_days,
    m.updated_at
FROM
    medicines m
ORDER BY
    CASE fn_get_medicine_stock_status(m.medicine_id)
        WHEN 'Critical' THEN 1
        WHEN 'Expired'  THEN 2
        WHEN 'Low'      THEN 3
        ELSE 4
    END, m.name;

-- ============================================================
-- VIEW 3: vw_patient_medical_history
-- Full patient history including appointments & prescriptions
-- ============================================================
CREATE OR REPLACE VIEW vw_patient_medical_history AS
SELECT
    p.patient_id,
    p.first_name || ' ' || p.last_name           AS patient_name,
    p.date_of_birth,
    fn_get_patient_age(p.patient_id)             AS age,
    p.blood_group,
    p.gender,
    -- Appointment
    a.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status                                      AS appointment_status,
    a.reason,
    -- Doctor
    d.first_name || ' ' || d.last_name           AS doctor_name,
    d.specialization,
    -- Prescription
    pr.prescription_id,
    pr.diagnosis,
    pr.issued_date,
    pr.status                                     AS prescription_status,
    -- Count medicines in prescription
    (SELECT COUNT(*) FROM prescription_items pi
     WHERE pi.prescription_id = pr.prescription_id) AS medicines_prescribed
FROM
    patients p
    JOIN appointments  a  ON a.patient_id  = p.patient_id
    JOIN doctors       d  ON d.doctor_id   = a.doctor_id
    LEFT JOIN prescriptions pr ON pr.appointment_id = a.appointment_id
ORDER BY
    p.patient_id, a.appointment_date DESC;

-- ============================================================
-- VIEW 4: vw_most_used_medicines (BI / Analytics)
-- Most dispensed medicines ranked by usage — WOW FACTOR
-- ============================================================
CREATE OR REPLACE VIEW vw_most_used_medicines AS
SELECT
    m.medicine_id,
    m.name                                         AS medicine_name,
    m.category,
    m.dosage_form,
    m.unit_price,
    m.stock_quantity,
    -- Total units sold all-time
    NVL(SUM(si.quantity), 0)                       AS total_units_sold,
    -- Total revenue generated
    NVL(SUM(si.subtotal), 0)                       AS total_revenue,
    -- Number of distinct patients
    COUNT(DISTINCT s.patient_id)                   AS distinct_patients,
    -- Number of distinct prescriptions
    COUNT(DISTINCT pr_si.prescription_id)          AS times_prescribed,
    -- Average quantity per sale
    ROUND(AVG(si.quantity), 2)                     AS avg_qty_per_sale,
    -- Rank by units sold
    RANK() OVER (ORDER BY NVL(SUM(si.quantity), 0) DESC) AS usage_rank
FROM
    medicines m
    LEFT JOIN sale_items si ON si.medicine_id = m.medicine_id
    LEFT JOIN sales      s  ON s.sale_id      = si.sale_id
    LEFT JOIN prescription_items pi_m ON pi_m.medicine_id = m.medicine_id
    LEFT JOIN prescriptions pr_si ON pr_si.prescription_id = pi_m.prescription_id
GROUP BY
    m.medicine_id, m.name, m.category,
    m.dosage_form, m.unit_price, m.stock_quantity
ORDER BY
    total_units_sold DESC;

-- ============================================================
-- VIEW 5: vw_supplier_performance
-- Supplier supply history and reliability stats
-- ============================================================
CREATE OR REPLACE VIEW vw_supplier_performance AS
SELECT
    s.supplier_id,
    s.company_name,
    s.contact_person,
    s.phone,
    s.rating,
    COUNT(so.supply_id)                           AS total_orders,
    NVL(SUM(so.quantity), 0)                      AS total_units_supplied,
    NVL(SUM(so.total_cost), 0)                    AS total_value_supplied,
    COUNT(CASE WHEN so.status = 'Delivered' THEN 1 END) AS delivered_orders,
    COUNT(CASE WHEN so.status = 'Cancelled' THEN 1 END) AS cancelled_orders,
    ROUND(
        COUNT(CASE WHEN so.status = 'Delivered' THEN 1 END) * 100.0
        / NULLIF(COUNT(so.supply_id), 0), 2
    )                                             AS delivery_rate_pct,
    MAX(so.supplied_date)                         AS last_supply_date
FROM
    suppliers s
    LEFT JOIN supply_orders so ON so.supplier_id = s.supplier_id
GROUP BY
    s.supplier_id, s.company_name, s.contact_person, s.phone, s.rating
ORDER BY
    total_units_supplied DESC;

-- ============================================================
-- VIEW 6: vw_daily_revenue_summary
-- Daily sales revenue breakdown (BI)
-- ============================================================
CREATE OR REPLACE VIEW vw_daily_revenue_summary AS
SELECT
    TRUNC(s.sale_date)                              AS sale_day,
    COUNT(DISTINCT s.sale_id)                       AS total_transactions,
    COUNT(DISTINCT s.patient_id)                    AS unique_patients,
    NVL(SUM(s.total_amount), 0)                     AS total_revenue,
    NVL(AVG(s.total_amount), 0)                     AS avg_transaction_value,
    ph.first_name || ' ' || ph.last_name            AS pharmacist_name
FROM
    sales s
    JOIN pharmacists ph ON ph.pharmacist_id = s.pharmacist_id
GROUP BY
    TRUNC(s.sale_date), ph.first_name || ' ' || ph.last_name
ORDER BY
    sale_day DESC;

COMMIT;
