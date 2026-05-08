-- ============================================================
-- MERIDIAN - Oracle PL/SQL User-Defined Functions
-- ============================================================

-- ============================================================
-- FUNCTION 1: fn_get_patient_age
-- Returns the age of a patient in years given their patient_id
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_patient_age(p_patient_id IN NUMBER)
RETURN NUMBER
IS
    v_dob  DATE;
    v_age  NUMBER;
BEGIN
    SELECT date_of_birth INTO v_dob
    FROM   patients
    WHERE  patient_id = p_patient_id;

    v_age := TRUNC(MONTHS_BETWEEN(SYSDATE, v_dob) / 12);
    RETURN v_age;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
    WHEN OTHERS THEN
        RETURN NULL;
END fn_get_patient_age;
/

-- ============================================================
-- FUNCTION 2: fn_get_medicine_stock_status
-- Returns: 'Critical' / 'Low' / 'Normal' / 'Expired'
-- based on stock level and expiry date
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_medicine_stock_status(p_medicine_id IN NUMBER)
RETURN VARCHAR2
IS
    v_stock   NUMBER;
    v_reorder NUMBER;
    v_expiry  DATE;
BEGIN
    SELECT stock_quantity, reorder_level, expiry_date
    INTO   v_stock, v_reorder, v_expiry
    FROM   medicines
    WHERE  medicine_id = p_medicine_id;

    IF v_expiry IS NOT NULL AND v_expiry < SYSDATE THEN
        RETURN 'Expired';
    ELSIF v_stock = 0 THEN
        RETURN 'Critical';
    ELSIF v_stock <= v_reorder THEN
        RETURN 'Low';
    ELSE
        RETURN 'Normal';
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN 'Unknown';
    WHEN OTHERS        THEN RETURN 'Error';
END fn_get_medicine_stock_status;
/

-- ============================================================
-- FUNCTION 3: fn_count_appointments_today
-- Returns number of appointments for a doctor today
-- ============================================================
CREATE OR REPLACE FUNCTION fn_count_appointments_today(p_doctor_id IN NUMBER)
RETURN NUMBER
IS
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO   v_count
    FROM   appointments
    WHERE  doctor_id       = p_doctor_id
    AND    appointment_date = TRUNC(SYSDATE)
    AND    status NOT IN ('Cancelled');

    RETURN v_count;
EXCEPTION
    WHEN OTHERS THEN RETURN 0;
END fn_count_appointments_today;
/

-- ============================================================
-- FUNCTION 4: fn_get_total_revenue
-- Returns total sales revenue between two dates
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_total_revenue(
    p_start_date IN DATE,
    p_end_date   IN DATE
)
RETURN NUMBER
IS
    v_total NUMBER := 0;
BEGIN
    SELECT NVL(SUM(total_amount), 0)
    INTO   v_total
    FROM   sales
    WHERE  sale_date BETWEEN p_start_date AND p_end_date;

    RETURN v_total;
EXCEPTION
    WHEN OTHERS THEN RETURN 0;
END fn_get_total_revenue;
/

-- ============================================================
-- FUNCTION 5: fn_is_medicine_expired
-- Returns 1 if expired, 0 if not, -1 if no expiry set
-- ============================================================
CREATE OR REPLACE FUNCTION fn_is_medicine_expired(p_medicine_id IN NUMBER)
RETURN NUMBER
IS
    v_expiry DATE;
BEGIN
    SELECT expiry_date INTO v_expiry
    FROM   medicines
    WHERE  medicine_id = p_medicine_id;

    IF v_expiry IS NULL THEN
        RETURN -1;
    ELSIF v_expiry < SYSDATE THEN
        RETURN 1;
    ELSE
        RETURN 0;
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN -1;
    WHEN OTHERS        THEN RETURN -1;
END fn_is_medicine_expired;
/

COMMIT;
