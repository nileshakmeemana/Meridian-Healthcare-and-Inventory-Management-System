-- ============================================================
-- MERIDIAN - Oracle PL/SQL Triggers
-- ============================================================

-- ============================================================
-- TRIGGER 1: trg_low_stock_alert
-- Fires AFTER UPDATE on medicines.stock_quantity
-- Automatically creates a notification for ALL pharmacists
-- when stock drops below reorder_level
-- ============================================================
CREATE OR REPLACE TRIGGER trg_low_stock_alert
AFTER UPDATE OF stock_quantity ON medicines
FOR EACH ROW
WHEN (NEW.stock_quantity <= NEW.reorder_level AND OLD.stock_quantity > OLD.reorder_level)
DECLARE
    v_count NUMBER;
BEGIN
    -- Notify all active pharmacists
    FOR rec IN (
        SELECT u.user_id
        FROM   users u
        JOIN   pharmacists p ON p.user_id = u.user_id
        WHERE  u.is_active = 1
    ) LOOP
        INSERT INTO notifications (
            user_id, title, message, type
        ) VALUES (
            rec.user_id,
            'Low Stock Alert',
            'Medicine "' || :NEW.name || '" has reached low stock. ' ||
            'Current quantity: ' || :NEW.stock_quantity || ', Reorder level: ' || :NEW.reorder_level,
            'Stock'
        );
    END LOOP;

    -- Also log to audit
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
    VALUES (
        NULL,
        'LOW_STOCK_ALERT',
        'MEDICINES',
        :NEW.medicine_id,
        '{"medicine":"' || :NEW.name || '","stock":' || :NEW.stock_quantity || ',"reorder":' || :NEW.reorder_level || '}'
    );

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block the main transaction
        NULL;
END trg_low_stock_alert;
/

-- ============================================================
-- TRIGGER 2: trg_stock_history_log
-- Fires AFTER UPDATE on medicines.stock_quantity
-- Maintains a complete audit trail of every stock change
-- ============================================================
CREATE OR REPLACE TRIGGER trg_stock_history_log
AFTER UPDATE OF stock_quantity ON medicines
FOR EACH ROW
DECLARE
    v_change_type VARCHAR2(20);
    v_diff        NUMBER;
BEGIN
    v_diff := :NEW.stock_quantity - :OLD.stock_quantity;

    IF v_diff > 0 THEN
        v_change_type := 'Add';
    ELSIF v_diff < 0 THEN
        v_change_type := 'Remove';
    ELSE
        RETURN;  -- no actual change
    END IF;

    INSERT INTO stock_history (
        medicine_id,
        changed_by,
        change_type,
        quantity_before,
        quantity_change,
        quantity_after,
        reason
    ) VALUES (
        :NEW.medicine_id,
        NVL(SYS_CONTEXT('USERENV','CLIENT_IDENTIFIER'), 0),
        v_change_type,
        :OLD.stock_quantity,
        v_diff,
        :NEW.stock_quantity,
        'Auto-logged by trigger'
    );
EXCEPTION
    WHEN OTHERS THEN NULL;
END trg_stock_history_log;
/

-- ============================================================
-- TRIGGER 3: trg_appointment_notification
-- Fires AFTER INSERT on appointments
-- Notifies patient and doctor about new appointment
-- ============================================================
CREATE OR REPLACE TRIGGER trg_appointment_notification
AFTER INSERT ON appointments
FOR EACH ROW
DECLARE
    v_patient_user_id NUMBER;
    v_doctor_user_id  NUMBER;
    v_patient_name    VARCHAR2(101);
    v_doctor_name     VARCHAR2(101);
BEGIN
    -- Get patient user_id and name
    SELECT u.user_id, p.first_name || ' ' || p.last_name
    INTO   v_patient_user_id, v_patient_name
    FROM   patients p
    JOIN   users u ON u.user_id = p.user_id
    WHERE  p.patient_id = :NEW.patient_id;

    -- Get doctor user_id and name
    SELECT u.user_id, d.first_name || ' ' || d.last_name
    INTO   v_doctor_user_id, v_doctor_name
    FROM   doctors d
    JOIN   users u ON u.user_id = d.user_id
    WHERE  d.doctor_id = :NEW.doctor_id;

    -- Notify patient
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        v_patient_user_id,
        'Appointment Confirmed',
        'Your appointment with Dr. ' || v_doctor_name ||
        ' is scheduled for ' || TO_CHAR(:NEW.appointment_date, 'DD-Mon-YYYY') ||
        ' at ' || :NEW.appointment_time || '.',
        'Appointment'
    );

    -- Notify doctor
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        v_doctor_user_id,
        'New Appointment',
        'New appointment from patient ' || v_patient_name ||
        ' on ' || TO_CHAR(:NEW.appointment_date, 'DD-Mon-YYYY') ||
        ' at ' || :NEW.appointment_time || '.',
        'Appointment'
    );

    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN NULL;
    WHEN OTHERS THEN NULL;
END trg_appointment_notification;
/

-- ============================================================
-- TRIGGER 4: trg_update_timestamps
-- Fires BEFORE UPDATE on key tables to auto-update updated_at
-- ============================================================
CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_medicines_updated_at
BEFORE UPDATE ON medicines
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- ============================================================
-- TRIGGER 5: trg_sale_update_stock
-- Fires AFTER INSERT on sale_items
-- Decrements medicine stock when a sale is recorded
-- ============================================================
CREATE OR REPLACE TRIGGER trg_sale_update_stock
AFTER INSERT ON sale_items
FOR EACH ROW
DECLARE
    v_current_stock NUMBER;
BEGIN
    SELECT stock_quantity INTO v_current_stock
    FROM   medicines
    WHERE  medicine_id = :NEW.medicine_id
    FOR UPDATE;

    IF v_current_stock < :NEW.quantity THEN
        RAISE_APPLICATION_ERROR(-20001, 'Insufficient stock for medicine_id=' || :NEW.medicine_id);
    END IF;

    UPDATE medicines
    SET    stock_quantity = stock_quantity - :NEW.quantity
    WHERE  medicine_id = :NEW.medicine_id;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20002, 'Medicine not found: ' || :NEW.medicine_id);
END trg_sale_update_stock;
/

-- ============================================================
-- TRIGGER 6: trg_supply_update_stock
-- Fires AFTER UPDATE on supply_orders (when status = 'Delivered')
-- Adds stock when a supply order is delivered
-- ============================================================
CREATE OR REPLACE TRIGGER trg_supply_update_stock
AFTER UPDATE OF status ON supply_orders
FOR EACH ROW
WHEN (NEW.status = 'Delivered' AND OLD.status != 'Delivered')
BEGIN
    UPDATE medicines
    SET    stock_quantity = stock_quantity + :NEW.quantity,
           expiry_date = NVL(:NEW.expiry_date, expiry_date)
    WHERE  medicine_id = :NEW.medicine_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE_APPLICATION_ERROR(-20003, 'Failed to update stock on delivery: ' || SQLERRM);
END trg_supply_update_stock;
/

COMMIT;
