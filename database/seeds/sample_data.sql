-- ============================================================
-- MERIDIAN - Sample Data (Seeds)
-- NOTE: Passwords are bcrypt hashes of 'Password@123'
-- ============================================================

-- Admin User
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@meridian.health', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'admin');

-- Doctors
INSERT INTO users (username, email, password_hash, role) VALUES ('dr.silva',    'silva@meridian.health',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'doctor');
INSERT INTO users (username, email, password_hash, role) VALUES ('dr.fernando', 'fernando@meridian.health','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'doctor');
INSERT INTO users (username, email, password_hash, role) VALUES ('dr.perera',   'perera@meridian.health',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'doctor');

-- Pharmacists
INSERT INTO users (username, email, password_hash, role) VALUES ('pharm.nimal', 'nimal@meridian.health',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'pharmacist');
INSERT INTO users (username, email, password_hash, role) VALUES ('pharm.kamani','kamani@meridian.health',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'pharmacist');

-- Suppliers
INSERT INTO users (username, email, password_hash, role) VALUES ('supp.mediline','mediline@supplier.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'supplier');
INSERT INTO users (username, email, password_hash, role) VALUES ('supp.pharmax', 'pharmax@supplier.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'supplier');

-- Patients
INSERT INTO users (username, email, password_hash, role) VALUES ('pt.kasun',    'kasun@email.com',         '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'patient');
INSERT INTO users (username, email, password_hash, role) VALUES ('pt.malini',   'malini@email.com',        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'patient');
INSERT INTO users (username, email, password_hash, role) VALUES ('pt.saman',    'saman@email.com',         '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'patient');
INSERT INTO users (username, email, password_hash, role) VALUES ('pt.chamara',  'chamara@email.com',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'patient');
INSERT INTO users (username, email, password_hash, role) VALUES ('pt.nishantha','nishantha@email.com',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc7MFrLxOEuGIMT2pMqIZKAKie', 'patient');

-- Doctors profile
INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number, phone, experience_years, consultation_fee) VALUES
(2, 'Ashan',   'Silva',    'Cardiology',        'SLMC-2018-1001', '0771234001', 8,  2500);
INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number, phone, experience_years, consultation_fee) VALUES
(3, 'Roshan',  'Fernando', 'General Medicine',  'SLMC-2015-2002', '0771234002', 11, 1500);
INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number, phone, experience_years, consultation_fee) VALUES
(4, 'Dilani',  'Perera',   'Pediatrics',        'SLMC-2020-3003', '0771234003', 5,  2000);

-- Pharmacists profile
INSERT INTO pharmacists (user_id, first_name, last_name, license_number, phone, shift) VALUES
(5, 'Nimal',  'Bandara', 'PHARM-2019-001', '0771235001', 'Morning');
INSERT INTO pharmacists (user_id, first_name, last_name, license_number, phone, shift) VALUES
(6, 'Kamani', 'Wickrama', 'PHARM-2021-002', '0771235002', 'Afternoon');

-- Suppliers profile
INSERT INTO suppliers (user_id, company_name, contact_person, phone, email, address, license_number) VALUES
(7, 'MediLine Pharmaceuticals', 'Suresh Gunaratne', '0112345001', 'suresh@mediline.lk', 'No.12, Colombo 03', 'SUP-LIC-001');
INSERT INTO suppliers (user_id, company_name, contact_person, phone, email, address, license_number) VALUES
(8, 'PharmaX Lanka (Pvt) Ltd', 'Pradeep Ranatunga','0112345002', 'pradeep@pharmax.lk', 'No.45, Kandy Rd', 'SUP-LIC-002');

-- Patients profile
INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone) VALUES
(9,  'Kasun',    'Rajapaksha', DATE '1990-03-15', 'Male',   'B+', '0711100001', '12/A, Galle Rd, Colombo', 'Nishani Rajapaksha', '0711100002');
INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone) VALUES
(10, 'Malini',   'Jayasinghe', DATE '1985-07-22', 'Female', 'O+', '0711100003', '45 Kandy Rd, Kurunegala', 'Sampath Jayasinghe', '0711100004');
INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone) VALUES
(11, 'Saman',    'Kumara',     DATE '1978-12-10', 'Male',   'A-', '0711100005', '78 Main St, Matara',      'Kumari Saman',       '0711100006');
INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone) VALUES
(12, 'Chamara',  'Dissanayake',DATE '1995-05-28', 'Male',   'AB+','0711100007', '23 Temple Rd, Gampaha',   'Nadeeka Chamara',    '0711100008');
INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, blood_group, phone, address, emergency_contact, emergency_phone) VALUES
(13, 'Nishantha','Weerasinghe',DATE '2010-09-03', 'Male',   'O-', '0711100009', '56 School Rd, Ratnapura', 'Pushpa Weerasinghe', '0711100010');

-- Medicines (15+ records)
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Amoxiclav 625mg','Amoxicillin/Clavulanate','Antibiotics','GSK Lanka',   320.00, 150, 20, DATE '2026-12-31', 'Tablet','625mg', 1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Panadol 500mg',  'Paracetamol',            'Analgesics', 'GSK Lanka',    45.00, 500, 50, DATE '2027-06-30', 'Tablet','500mg', 0);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Atorvastatin 20mg','Atorvastatin',          'Cardiovascular','Pfizer',   180.00,  80, 15, DATE '2026-09-30', 'Tablet','20mg',  1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Metformin 500mg', 'Metformin HCl',          'Antidiabetic','AstraZeneca', 95.00, 200, 30, DATE '2027-03-31', 'Tablet','500mg', 1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Omeprazole 20mg', 'Omeprazole',             'GI',         'Ranbaxy',      85.00, 120, 20, DATE '2026-11-30', 'Capsule','20mg', 1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Salbutamol Inhaler','Salbutamol',           'Respiratory','GSK Lanka',   550.00,  40, 10, DATE '2026-08-31', 'Inhaler','100mcg',1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Ibuprofen 400mg', 'Ibuprofen',              'Analgesics', 'Upsa',        60.00,  250, 40, DATE '2027-01-31', 'Tablet','400mg', 0);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Cetirizine 10mg', 'Cetirizine HCl',         'Antihistamine','Cipla',     35.00,  300, 50, DATE '2027-05-31', 'Tablet','10mg',  0);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Amlodipine 5mg',  'Amlodipine Besylate',    'Cardiovascular','Pfizer',   125.00, 100, 20, DATE '2026-10-31', 'Tablet','5mg',   1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Vitamin C 500mg', 'Ascorbic Acid',          'Vitamins',   'Ranbaxy',      25.00, 400, 60, DATE '2027-08-31', 'Tablet','500mg', 0);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Doxycycline 100mg','Doxycycline',           'Antibiotics','Cipla',       155.00,  60, 15, DATE '2026-07-31', 'Capsule','100mg',1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Losartan 50mg',   'Losartan Potassium',     'Cardiovascular','MSD',      145.00,  90, 15, DATE '2026-12-31', 'Tablet','50mg',  1);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Cough Syrup 100ml','Dextromethorphan',       'Respiratory','Benadryl',   195.00,  70, 15, DATE '2026-09-30', 'Syrup','15mg/5ml',0);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Zinc Supplements','Zinc Sulfate',            'Vitamins',   'Pfizer',       55.00, 180, 30, DATE '2027-06-30', 'Tablet','20mg',  0);
INSERT INTO medicines (name, generic_name, category, manufacturer, unit_price, stock_quantity, reorder_level, expiry_date, dosage_form, strength, requires_prescription) VALUES
('Insulin Glargine', 'Insulin Glargine',       'Antidiabetic','Sanofi',    1850.00,  8,   5, DATE '2026-06-30', 'Injection','100U/ml',1);

-- Sample appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason) VALUES
(1, 2, SYSDATE, '09:00 AM', 'Scheduled',  'Chest pain follow-up');
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason) VALUES
(2, 2, SYSDATE, '10:00 AM', 'Scheduled',  'Routine checkup');
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason) VALUES
(3, 1, SYSDATE, '11:00 AM', 'Scheduled',  'Blood pressure monitoring');
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason) VALUES
(5, 3, SYSDATE, '09:30 AM', 'Scheduled',  'Child vaccination check');
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason) VALUES
(4, 2, TRUNC(SYSDATE)-1, '02:00 PM', 'Completed', 'Fever and cough');

COMMIT;
