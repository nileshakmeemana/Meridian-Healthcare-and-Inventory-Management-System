-- ============================================================
-- MERIDIAN - Oracle PL/SQL Stored Procedures
-- ============================================================

-- ============================================================
-- PROCEDURE 1: sp_book_appointment
-- Books a new appointment with validation
-- Returns: p_appointment_id (new ID) and p_status (success/error)
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_book_appointment(
    p_patient_id      IN  appointments.patient_id%TYPE,
    p_doctor_id       IN  appointments.doctor_id%TYPE,
    p_date            IN  appointments.appointment_date%TYPE,
    p_time            IN  appointments.appointment_time%TYPE,
    p_reason          IN  appointments.reason%TYPE,
    p_appointment_id  OUT appointments.appointment_id%TYPE,
    p_status          OUT VARCHAR2,
    p_message         OUT VARCHAR2
)
IS
    v_conflict  NUMBER := 0;
    v_doc_exists NUMBER := 0;
    v_pat_exists NUMBER := 0;
BEGIN
    -- Validate doctor exists and is active
    SELECT COUNT(*) INTO v_doc_exists
    FROM doctors d JOIN users u ON u.user_id = d.user_id
    WHERE d.doctor_id = p_doctor_id AND u.is_active = 1;

    IF v_doc_exists = 0 THEN
        p_status  := 'ERROR';
        p_message := 'Doctor not found or inactive';
        RETURN;
    END IF;

    -- Validate patient exists
    SELECT COUNT(*) INTO v_pat_exists
    FROM patients WHERE patient_id = p_patient_id;

    IF v_pat_exists = 0 THEN
        p_status  := 'ERROR';
        p_message := 'Patient not found';
        RETURN;
    END IF;

    -- Check date is not in the past
    IF TRUNC(p_date) < TRUNC(SYSDATE) THEN
        p_status  := 'ERROR';
        p_message := 'Appointment date cannot be in the past';
        RETURN;
    END IF;

    -- Check for scheduling conflict (same doctor, same date, same time)
    SELECT COUNT(*) INTO v_conflict
    FROM appointments
    WHERE doctor_id       = p_doctor_id
    AND   appointment_date = TRUNC(p_date)
    AND   appointment_time = p_time
    AND   status NOT IN ('Cancelled');

    IF v_conflict > 0 THEN
        p_status  := 'ERROR';
        p_message := 'Time slot already booked for this doctor';
        RETURN;
    END IF;

    -- Insert appointment
    INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, appointment_time,
        reason, status
    ) VALUES (
        p_patient_id, p_doctor_id, TRUNC(p_date), p_time,
        p_reason, 'Scheduled'
    ) RETURNING appointment_id INTO p_appointment_id;

    p_status  := 'SUCCESS';
    p_message := 'Appointment booked successfully with ID: ' || p_appointment_id;
    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_appointment_id := NULL;
        p_status  := 'ERROR';
        p_message := 'Unexpected error: ' || SQLERRM;
END sp_book_appointment;
/

-- ============================================================
-- PROCEDURE 2: sp_issue_medicine (Sale)
-- Records a sale, decrements stock, updates prescription status
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_issue_medicine(
    p_pharmacist_id   IN  pharmacists.pharmacist_id%TYPE,
    p_patient_id      IN  patients.patient_id%TYPE,
    p_prescription_id IN  prescriptions.prescription_id%TYPE,
    p_medicine_items  IN  SYS.ODCINUMBERLIST,    -- medicine_ids
    p_quantities      IN  SYS.ODCINUMBERLIST,    -- quantities
    p_payment_method  IN  sales.payment_method%TYPE,
    p_sale_id         OUT sales.sale_id%TYPE,
    p_total_amount    OUT NUMBER,
    p_status          OUT VARCHAR2,
    p_message         OUT VARCHAR2
)
IS
    v_sale_id      NUMBER;
    v_unit_price   NUMBER;
    v_stock        NUMBER;
    v_total        NUMBER := 0;
    v_subtotal     NUMBER;
BEGIN
    -- Validate arrays same size
    IF p_medicine_items.COUNT != p_quantities.COUNT THEN
        p_status  := 'ERROR';
        p_message := 'Medicine and quantity arrays must have same size';
        RETURN;
    END IF;

    IF p_medicine_items.COUNT = 0 THEN
        p_status  := 'ERROR';
        p_message := 'No medicines provided';
        RETURN;
    END IF;

    -- Pre-check all stock levels before any insert
    FOR i IN 1..p_medicine_items.COUNT LOOP
        SELECT unit_price, stock_quantity
        INTO   v_unit_price, v_stock
        FROM   medicines
        WHERE  medicine_id = p_medicine_items(i);

        IF v_stock < p_quantities(i) THEN
            p_status  := 'ERROR';
            p_message := 'Insufficient stock for medicine_id=' || p_medicine_items(i) ||
                         ' (available: ' || v_stock || ', requested: ' || p_quantities(i) || ')';
            RETURN;
        END IF;

        v_subtotal := v_unit_price * p_quantities(i);
        v_total    := v_total + v_subtotal;
    END LOOP;

    -- Create sale record
    INSERT INTO sales (pharmacist_id, patient_id, prescription_id, total_amount, payment_method)
    VALUES (p_pharmacist_id, p_patient_id, p_prescription_id, v_total, p_payment_method)
    RETURNING sale_id INTO v_sale_id;

    -- Insert sale items (triggers handle stock decrement)
    FOR i IN 1..p_medicine_items.COUNT LOOP
        SELECT unit_price INTO v_unit_price
        FROM   medicines WHERE medicine_id = p_medicine_items(i);

        v_subtotal := v_unit_price * p_quantities(i);

        INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal)
        VALUES (v_sale_id, p_medicine_items(i), p_quantities(i), v_unit_price, v_subtotal);
    END LOOP;

    -- Mark prescription as fulfilled if provided
    IF p_prescription_id IS NOT NULL THEN
        UPDATE prescriptions
        SET    status = 'Fulfilled'
        WHERE  prescription_id = p_prescription_id
        AND    status = 'Active';
    END IF;

    p_sale_id      := v_sale_id;
    p_total_amount := v_total;
    p_status       := 'SUCCESS';
    p_message      := 'Sale completed. Total: ' || v_total;
    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_sale_id      := NULL;
        p_total_amount := 0;
        p_status       := 'ERROR';
        p_message      := 'Sale failed: ' || SQLERRM;
END sp_issue_medicine;
/

-- ============================================================
-- PROCEDURE 3: sp_add_medicine_stock
-- Adds stock quantity to a medicine (supply received)
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_add_medicine_stock(
    p_medicine_id   IN  medicines.medicine_id%TYPE,
    p_quantity      IN  NUMBER,
    p_added_by      IN  users.user_id%TYPE,
    p_reason        IN  VARCHAR2 DEFAULT 'Manual stock addition',
    p_status        OUT VARCHAR2,
    p_message       OUT VARCHAR2
)
IS
    v_before NUMBER;
BEGIN
    IF p_quantity <= 0 THEN
        p_status  := 'ERROR';
        p_message := 'Quantity must be positive';
        RETURN;
    END IF;

    SELECT stock_quantity INTO v_before
    FROM   medicines WHERE medicine_id = p_medicine_id FOR UPDATE;

    UPDATE medicines
    SET    stock_quantity = stock_quantity + p_quantity
    WHERE  medicine_id   = p_medicine_id;

    -- Manual stock history entry
    INSERT INTO stock_history (
        medicine_id, changed_by, change_type,
        quantity_before, quantity_change, quantity_after, reason
    ) VALUES (
        p_medicine_id, p_added_by, 'Supply',
        v_before, p_quantity, v_before + p_quantity, p_reason
    );

    p_status  := 'SUCCESS';
    p_message := 'Stock updated. New quantity: ' || (v_before + p_quantity);
    COMMIT;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_status  := 'ERROR';
        p_message := 'Medicine not found';
    WHEN OTHERS THEN
        ROLLBACK;
        p_status  := 'ERROR';
        p_message := SQLERRM;
END sp_add_medicine_stock;
/

-- ============================================================
-- PROCEDURE 4: sp_get_most_used_medicines
-- Business Intelligence: returns top N most used medicines
-- with usage stats for reporting dashboard
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_get_most_used_medicines(
    p_top_n         IN  NUMBER DEFAULT 10,
    p_start_date    IN  DATE   DEFAULT ADD_MONTHS(SYSDATE, -3),
    p_end_date      IN  DATE   DEFAULT SYSDATE,
    p_result_cursor OUT SYS_REFCURSOR
)
IS
BEGIN
    OPEN p_result_cursor FOR
        SELECT
            m.medicine_id,
            m.name              AS medicine_name,
            m.category,
            m.unit_price,
            m.stock_quantity,
            NVL(SUM(si.quantity), 0)                           AS total_units_sold,
            NVL(SUM(si.subtotal), 0)                           AS total_revenue,
            COUNT(DISTINCT s.patient_id)                       AS unique_patients,
            COUNT(DISTINCT s.sale_id)                          AS number_of_transactions,
            ROUND(NVL(AVG(si.quantity), 0), 2)                 AS avg_qty_per_transaction,
            fn_get_medicine_stock_status(m.medicine_id)        AS current_status,
            RANK() OVER (ORDER BY NVL(SUM(si.quantity), 0) DESC) AS rank_position
        FROM
            medicines m
            LEFT JOIN sale_items si ON si.medicine_id = m.medicine_id
            LEFT JOIN sales      s  ON s.sale_id      = si.sale_id
                                   AND s.sale_date BETWEEN p_start_date AND p_end_date
        GROUP BY
            m.medicine_id, m.name, m.category, m.unit_price, m.stock_quantity
        ORDER BY
            total_units_sold DESC
        FETCH FIRST p_top_n ROWS ONLY;
END sp_get_most_used_medicines;
/

-- ============================================================
-- PROCEDURE 5: sp_create_prescription
-- Doctor creates a prescription with medicines
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_create_prescription(
    p_appointment_id  IN  appointments.appointment_id%TYPE,
    p_diagnosis       IN  prescriptions.diagnosis%TYPE,
    p_notes           IN  prescriptions.notes%TYPE,
    p_valid_days      IN  NUMBER DEFAULT 30,
    p_medicine_ids    IN  SYS.ODCINUMBERLIST,
    p_quantities      IN  SYS.ODCINUMBERLIST,
    p_dosages         IN  SYS.ODCIVARCHAR2LIST,
    p_frequencies     IN  SYS.ODCIVARCHAR2LIST,
    p_durations       IN  SYS.ODCINUMBERLIST,
    p_prescription_id OUT prescriptions.prescription_id%TYPE,
    p_status          OUT VARCHAR2,
    p_message         OUT VARCHAR2
)
IS
    v_patient_id  NUMBER;
    v_doctor_id   NUMBER;
    v_appt_status VARCHAR2(20);
BEGIN
    -- Get appointment details
    SELECT patient_id, doctor_id, status
    INTO   v_patient_id, v_doctor_id, v_appt_status
    FROM   appointments
    WHERE  appointment_id = p_appointment_id;

    -- Mark appointment as completed
    UPDATE appointments SET status = 'Completed' WHERE appointment_id = p_appointment_id;

    -- Create prescription
    INSERT INTO prescriptions (
        appointment_id, patient_id, doctor_id,
        diagnosis, notes, valid_until, status
    ) VALUES (
        p_appointment_id, v_patient_id, v_doctor_id,
        p_diagnosis, p_notes, SYSDATE + p_valid_days, 'Active'
    ) RETURNING prescription_id INTO p_prescription_id;

    -- Add medicine items
    FOR i IN 1..p_medicine_ids.COUNT LOOP
        INSERT INTO prescription_items (
            prescription_id, medicine_id, quantity,
            dosage, frequency, duration_days
        ) VALUES (
            p_prescription_id,
            p_medicine_ids(i),
            p_quantities(i),
            p_dosages(i),
            p_frequencies(i),
            p_durations(i)
        );
    END LOOP;

    p_status  := 'SUCCESS';
    p_message := 'Prescription created with ID: ' || p_prescription_id;
    COMMIT;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        p_status  := 'ERROR';
        p_message := 'Appointment not found';
    WHEN OTHERS THEN
        ROLLBACK;
        p_prescription_id := NULL;
        p_status  := 'ERROR';
        p_message := SQLERRM;
END sp_create_prescription;
/

-- ============================================================
-- PROCEDURE 6: sp_generate_dashboard_stats
-- Returns key metrics for the admin dashboard
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_generate_dashboard_stats(
    p_stats_cursor OUT SYS_REFCURSOR
)
IS
BEGIN
    OPEN p_stats_cursor FOR
        SELECT
            (SELECT COUNT(*) FROM patients p JOIN users u ON u.user_id = p.user_id WHERE u.is_active = 1)  AS total_active_patients,
            (SELECT COUNT(*) FROM doctors d  JOIN users u ON u.user_id = d.user_id WHERE u.is_active = 1)  AS total_active_doctors,
            (SELECT COUNT(*) FROM pharmacists ph JOIN users u ON u.user_id = ph.user_id WHERE u.is_active = 1) AS total_pharmacists,
            (SELECT COUNT(*) FROM medicines WHERE stock_quantity > 0)  AS medicines_in_stock,
            (SELECT COUNT(*) FROM medicines WHERE fn_get_medicine_stock_status(medicine_id) IN ('Low','Critical')) AS low_stock_count,
            (SELECT COUNT(*) FROM appointments WHERE appointment_date = TRUNC(SYSDATE)) AS today_appointments,
            (SELECT COUNT(*) FROM appointments WHERE appointment_date = TRUNC(SYSDATE) AND status = 'Completed') AS completed_today,
            (SELECT NVL(SUM(total_amount),0) FROM sales WHERE sale_date = TRUNC(SYSDATE)) AS today_revenue,
            (SELECT NVL(SUM(total_amount),0) FROM sales WHERE sale_date >= TRUNC(SYSDATE,'MM')) AS month_revenue
        FROM DUAL;
END sp_generate_dashboard_stats;
/

COMMIT;
