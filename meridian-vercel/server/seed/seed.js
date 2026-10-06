// ============================================================
// MERIDIAN — Seed data  (npm run seed)
// • Every collection gets more than 10 meaningful records
// • 6 months of history so the BI / mining reports have signal
// • Ends by running live procedures so every trigger fires once
// All demo accounts use the password:  Password@123
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const m = require('../models');
const { createViews } = require('../database/views');
const P = require('../database/procedures');
const { toDay } = require('../utils/http');
const { DAY_MS } = require('../database/functions');

const PASSWORD = 'Password@123';

/* deterministic PRNG so every run produces the same data */
let seed = 20260601;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a, b) => Math.floor(rand() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

const TODAY = toDay();
const daysFromNow = (n) => new Date(TODAY.getTime() + n * DAY_MS);
const monthsFromNow = (n) => { const d = new Date(TODAY); d.setUTCMonth(d.getUTCMonth() + n); return d; };
const SLOTS = m.Appointment.TIME_SLOTS;

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */
const DOCTORS = [
  ['silva', 'Ashan', 'Silva', 'Cardiology', 'SLMC-2018-1001', 8, 2500, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 'OPD 4'],
  ['fernando', 'Roshan', 'Fernando', 'General Medicine', 'SLMC-2015-2002', 11, 1500, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'OPD 1'],
  ['perera', 'Dilani', 'Perera', 'Pediatrics', 'SLMC-2020-3003', 5, 2000, ['Mon', 'Wed', 'Fri', 'Sat'], 'Children’s Wing 2'],
  ['jayawardena', 'Nuwan', 'Jayawardena', 'Endocrinology', 'SLMC-2014-4004', 13, 2800, ['Tue', 'Thu', 'Sat'], 'OPD 6'],
  ['gunasekara', 'Ishara', 'Gunasekara', 'Pulmonology', 'SLMC-2017-5005', 9, 2600, ['Mon', 'Tue', 'Thu', 'Fri'], 'OPD 3'],
  ['wijesinghe', 'Tharindu', 'Wijesinghe', 'Gastroenterology', 'SLMC-2016-6006', 10, 2700, ['Mon', 'Wed', 'Thu'], 'OPD 7'],
  ['rathnayake', 'Sanduni', 'Rathnayake', 'Dermatology', 'SLMC-2019-7007', 6, 2200, ['Tue', 'Wed', 'Fri'], 'OPD 9'],
  ['bandara', 'Kavinda', 'Bandara', 'Orthopaedics', 'SLMC-2013-8008', 14, 3000, ['Mon', 'Thu', 'Sat'], 'OPD 2'],
  ['herath', 'Madhavi', 'Herath', 'General Medicine', 'SLMC-2021-9009', 4, 1500, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'OPD 1'],
  ['abeysekara', 'Chathura', 'Abeysekara', 'Anaesthesiology', 'SLMC-2012-1010', 15, 3200, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'Theatre 3'],
  ['senanayake', 'Ruwini', 'Senanayake', 'Neurology', 'SLMC-2016-1111', 10, 3100, ['Wed', 'Fri'], 'OPD 8'],
  ['karunaratne', 'Lahiru', 'Karunaratne', 'Emergency Medicine', 'SLMC-2018-1212', 7, 1800, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 'ETU'],
];
const PHARMACISTS = [
  ['nimal', 'Nimal', 'Bandara', 'Morning'], ['kamani', 'Kamani', 'Wickrama', 'Afternoon'], ['ruwan', 'Ruwan', 'Peiris', 'Night'],
  ['dulani', 'Dulani', 'Samarasinghe', 'Morning'], ['asela', 'Asela', 'Gamage', 'Afternoon'], ['hiruni', 'Hiruni', 'Mendis', 'Morning'],
  ['sajith', 'Sajith', 'Kumara', 'Night'], ['piumi', 'Piumi', 'Rajapaksha', 'Afternoon'], ['dinesh', 'Dinesh', 'Weerakoon', 'Morning'],
  ['nadeesha', 'Nadeesha', 'Liyanage', 'Afternoon'], ['tharaka', 'Tharaka', 'Ekanayake', 'Night'],
];
const SUPPLIERS = [
  ['mediline', 'MediLine Pharmaceuticals', 'Suresh Gunaratne', 'No. 12, Union Place, Colombo 02', 8.9],
  ['pharmax', 'PharmaX Lanka (Pvt) Ltd', 'Pradeep Ranatunga', 'No. 45, Kandy Road, Kadawatha', 8.2],
  ['hemas', 'Hemas Healthcare Distributors', 'Anoma Dias', 'No. 75, Braybrooke Place, Colombo 02', 9.1],
  ['sunshine', 'Sunshine Medical Supplies', 'Mahesh Perera', 'No. 3, Galle Road, Dehiwala', 7.8],
  ['cic', 'CIC Pharma Solutions', 'Nilmini Fonseka', 'No. 199, Kew Road, Colombo 02', 8.5],
  ['slpc', 'State Pharmaceuticals Corporation', 'Gamini Rathnayake', 'No. 75, Sir Baron Jayatilaka Mw, Colombo 01', 7.5],
  ['surgicare', 'SurgiCare Lanka', 'Iresha Wijeratne', 'No. 22, Nawala Road, Rajagiriya', 8.0],
  ['labcore', 'LabCore Diagnostics', 'Ravindu Silva', 'No. 8, Baseline Road, Colombo 09', 8.7],
  ['coldchain', 'ColdChain Biologics', 'Shehani Perera', 'No. 51, Negombo Road, Wattala', 9.0],
  ['islandmed', 'Island Medical Imports', 'Kasun Jayasuriya', 'No. 14, Peradeniya Road, Kandy', 7.2],
  ['ceymed', 'CeyMed Wholesale', 'Thilini Abeywardena', 'No. 101, Main Street, Galle', 7.9],
];
const PATIENTS = [
  ['kasun', 'Kasun', 'Rajapaksha', '1990-03-15', 'Male', 'B+'], ['malini', 'Malini', 'Jayasinghe', '1985-07-22', 'Female', 'O+'],
  ['saman', 'Saman', 'Kumara', '1978-12-10', 'Male', 'A-'], ['chamara', 'Chamara', 'Dissanayake', '1995-05-28', 'Male', 'AB+'],
  ['nishantha', 'Nishantha', 'Weerasinghe', '2012-09-03', 'Male', 'O-'], ['ayesha', 'Ayesha', 'Fernando', '1992-01-19', 'Female', 'A+'],
  ['pradeep', 'Pradeep', 'Silva', '1969-11-02', 'Male', 'B-'], ['sachini', 'Sachini', 'Perera', '2001-04-11', 'Female', 'O+'],
  ['dilshan', 'Dilshan', 'Wickramasinghe', '1988-08-30', 'Male', 'A+'], ['harsha', 'Harsha', 'Gunawardena', '1975-02-14', 'Male', 'O+'],
  ['imesha', 'Imesha', 'Karunarathna', '1998-06-07', 'Female', 'B+'], ['ruwanthi', 'Ruwanthi', 'Senaratne', '1983-10-25', 'Female', 'AB-'],
  ['janaka', 'Janaka', 'Bandara', '1959-12-01', 'Male', 'A+'], ['thilini', 'Thilini', 'Madushani', '1996-03-03', 'Female', 'O-'],
  ['ravindu', 'Ravindu', 'Herath', '2015-07-17', 'Male', 'B+'], ['anjali', 'Anjali', 'Kodikara', '1990-09-09', 'Female', 'A-'],
  ['mahesh', 'Mahesh', 'Ranasinghe', '1972-05-21', 'Male', 'O+'], ['gayani', 'Gayani', 'Abeykoon', '1987-12-12', 'Female', 'B+'],
  ['sunil', 'Sunil', 'Jayakody', '1955-01-30', 'Male', 'A+'], ['dinithi', 'Dinithi', 'Samaraweera', '2005-11-18', 'Female', 'O+'],
  ['lakmal', 'Lakmal', 'Ekanayake', '1980-04-04', 'Male', 'AB+'], ['nethmi', 'Nethmi', 'Wijeratne', '1999-08-08', 'Female', 'A+'],
  ['chaminda', 'Chaminda', 'Amarasinghe', '1966-06-16', 'Male', 'B-'], ['hashini', 'Hashini', 'Liyanage', '1993-02-27', 'Female', 'O+'],
  ['buddhika', 'Buddhika', 'Rathnayake', '1984-07-07', 'Male', 'A+'], ['shanika', 'Shanika', 'Gamage', '1977-03-19', 'Female', 'O-'],
  ['tharindu', 'Tharindu', 'Mendis', '2010-10-10', 'Male', 'B+'], ['oshadi', 'Oshadi', 'Pathirana', '1994-12-24', 'Female', 'A-'],
  ['viraj', 'Viraj', 'Kulatunga', '1989-05-05', 'Male', 'O+'], ['madhu', 'Madhu', 'Senevirathne', '1970-09-29', 'Female', 'AB+'],
];
const TOWNS = ['Colombo 05', 'Nugegoda', 'Maharagama', 'Kottawa', 'Homagama', 'Kaduwela', 'Battaramulla', 'Dehiwala', 'Moratuwa', 'Kelaniya', 'Gampaha', 'Kandy'];

// [name, generic, sku, category, manufacturer, price, unit, stock, reorder, expiryMonths, form, strength, rx]
const MEDICINES = [
  ['Ceftriaxone 1g Injectable', 'Ceftriaxone sodium', 'ANT-8841', 'Antibiotics', 'Roche', 780, 'Vials', 1200, 200, 13, 'Injection', '1 g', true],
  ['Amoxiclav 625mg', 'Amoxicillin / Clavulanate', 'ANT-1203', 'Antibiotics', 'GSK', 320, 'Tablets', 1450, 200, 10, 'Tablet', '625 mg', true],
  ['Azithromycin 500mg', 'Azithromycin', 'ANT-1310', 'Antibiotics', 'Pfizer', 410, 'Tablets', 620, 120, 15, 'Tablet', '500 mg', true],
  ['Doxycycline 100mg', 'Doxycycline', 'ANT-1422', 'Antibiotics', 'Cipla', 155, 'Capsules', 160, 150, 4, 'Capsule', '100 mg', true],
  ['Ciprofloxacin 500mg', 'Ciprofloxacin', 'ANT-1544', 'Antibiotics', 'Bayer', 210, 'Tablets', 540, 100, 18, 'Tablet', '500 mg', true],
  ['Paracetamol 500mg', 'Paracetamol', 'ANA-2001', 'Analgesics', 'GSK', 6, 'Tablets', 9800, 1500, 20, 'Tablet', '500 mg', false],
  ['Ibuprofen 400mg', 'Ibuprofen', 'ANA-2034', 'Analgesics', 'Abbott', 12, 'Tablets', 3600, 600, 16, 'Tablet', '400 mg', false],
  ['Diclofenac 50mg', 'Diclofenac sodium', 'ANA-2047', 'Analgesics', 'Novartis', 18, 'Tablets', 2100, 400, 11, 'Tablet', '50 mg', true],
  ['Tramadol 50mg', 'Tramadol HCl', 'ANA-2080', 'Analgesics', 'Grünenthal', 45, 'Capsules', 380, 100, 9, 'Capsule', '50 mg', true],
  ['Atorvastatin 20mg', 'Atorvastatin', 'CVS-3011', 'Cardiovascular', 'Pfizer', 38, 'Tablets', 2600, 500, 14, 'Tablet', '20 mg', true],
  ['Amlodipine 5mg', 'Amlodipine besylate', 'CVS-3025', 'Cardiovascular', 'Pfizer', 22, 'Tablets', 3100, 500, 17, 'Tablet', '5 mg', true],
  ['Losartan 50mg', 'Losartan potassium', 'CVS-3040', 'Cardiovascular', 'MSD', 30, 'Tablets', 2400, 400, 12, 'Tablet', '50 mg', true],
  ['Clopidogrel 75mg', 'Clopidogrel', 'CVS-3066', 'Cardiovascular', 'Sanofi', 55, 'Tablets', 900, 300, 8, 'Tablet', '75 mg', true],
  ['Aspirin 75mg', 'Acetylsalicylic acid', 'CVS-3071', 'Cardiovascular', 'Bayer', 4, 'Tablets', 5200, 800, 22, 'Tablet', '75 mg', false],
  ['Metformin 500mg', 'Metformin HCl', 'DIA-4002', 'Antidiabetic', 'AstraZeneca', 9, 'Tablets', 6400, 1000, 19, 'Tablet', '500 mg', true],
  ['Gliclazide 80mg', 'Gliclazide', 'DIA-4015', 'Antidiabetic', 'Servier', 16, 'Tablets', 1800, 300, 13, 'Tablet', '80 mg', true],
  ['Insulin Glargine 100U/ml', 'Insulin glargine', 'DIA-4090', 'Antidiabetic', 'Sanofi', 4850, 'Pens', 18, 25, 5, 'Injection', '100 U/ml', true],
  ['Omeprazole 20mg', 'Omeprazole', 'GIT-5003', 'Gastrointestinal', 'Ranbaxy', 14, 'Capsules', 3900, 600, 15, 'Capsule', '20 mg', true],
  ['Ondansetron 4mg', 'Ondansetron', 'GIT-5019', 'Gastrointestinal', 'Novartis', 42, 'Tablets', 700, 150, 10, 'Tablet', '4 mg', true],
  ['Oral Rehydration Salts', 'ORS', 'GIT-5050', 'Gastrointestinal', 'SPC', 25, 'Sachets', 2300, 400, 24, 'Powder', '20.5 g', false],
  ['Salbutamol Inhaler 100mcg', 'Salbutamol', 'RES-6001', 'Respiratory', 'GSK', 950, 'Inhalers', 140, 60, 9, 'Inhaler', '100 mcg', true],
  ['Montelukast 10mg', 'Montelukast', 'RES-6020', 'Respiratory', 'MSD', 48, 'Tablets', 1300, 250, 14, 'Tablet', '10 mg', true],
  ['Cough Syrup 100ml', 'Dextromethorphan', 'RES-6044', 'Respiratory', 'Benadryl', 395, 'Bottles', 260, 80, 7, 'Syrup', '15 mg / 5 ml', false],
  ['Prednisolone 5mg', 'Prednisolone', 'RES-6070', 'Respiratory', 'Pfizer', 8, 'Tablets', 1900, 300, 16, 'Tablet', '5 mg', true],
  ['Cetirizine 10mg', 'Cetirizine HCl', 'AHS-7001', 'Antihistamine', 'Cipla', 7, 'Tablets', 4100, 600, 21, 'Tablet', '10 mg', false],
  ['Loratadine 10mg', 'Loratadine', 'AHS-7012', 'Antihistamine', 'Bayer', 11, 'Tablets', 1600, 300, 18, 'Tablet', '10 mg', false],
  ['Vitamin C 500mg', 'Ascorbic acid', 'VIT-8001', 'Vitamins', 'Ranbaxy', 5, 'Tablets', 5600, 800, 23, 'Tablet', '500 mg', false],
  ['Vitamin D3 1000IU', 'Cholecalciferol', 'VIT-8016', 'Vitamins', 'Abbott', 19, 'Capsules', 2200, 400, 20, 'Capsule', '1000 IU', false],
  ['Zinc Sulphate 20mg', 'Zinc sulphate', 'VIT-8030', 'Vitamins', 'Pfizer', 10, 'Tablets', 1700, 300, 17, 'Tablet', '20 mg', false],
  ['Folic Acid 5mg', 'Folic acid', 'VIT-8044', 'Vitamins', 'SPC', 3, 'Tablets', 3000, 500, 25, 'Tablet', '5 mg', false],
  ['Propofol 1% 20ml Emulsion', 'Propofol', 'ANE-4029', 'Anaesthetics', 'Fresenius Kabi', 1650, 'Ampoules', 450, 500, 8, 'Injection', '10 mg/ml', true],
  ['Lidocaine 2% 5ml', 'Lidocaine HCl', 'ANE-4041', 'Anaesthetics', 'AstraZeneca', 210, 'Ampoules', 820, 200, 12, 'Injection', '20 mg/ml', true],
  ['Sterile Luer-Lock Syringe 5mL', 'Disposable syringe', 'SUP-1120', 'Surgical Supplies', 'BD', 28, 'Pcs', 12500, 2000, 40, 'Device', '5 ml', false],
  ['Surgical Gloves (M)', 'Latex gloves', 'SUP-1150', 'Surgical Supplies', 'Ansell', 65, 'Pairs', 4800, 1000, 30, 'Device', 'Size 7', false],
  ['Absorbable Suture 3-0', 'Polyglactin 910', 'SUP-1188', 'Surgical Supplies', 'Ethicon', 640, 'Packs', 0, 120, 26, 'Device', '3-0', false],
  ['Rapid PCR Diagnostic Assay', 'SARS-CoV-2 / Influenza panel', 'LAB-0432', 'Diagnostics', 'Roche', 3200, 'Kits', 320, 300, 2, 'Kit', '1 test', false],
  ['Blood Glucose Test Strips', 'Glucose oxidase strips', 'LAB-0450', 'Diagnostics', 'Accu-Chek', 85, 'Strips', 2600, 500, 11, 'Kit', '50 strips', false],
  ['HbA1c Reagent Cartridge', 'HbA1c immunoassay', 'LAB-0477', 'Diagnostics', 'Siemens', 1450, 'Cartridges', 90, 40, -1, 'Kit', '10 tests', false],
  ['Hydrocortisone Cream 1%', 'Hydrocortisone', 'DER-9001', 'Dermatology', 'GSK', 260, 'Tubes', 480, 100, 14, 'Cream', '1%', false],
  ['Clotrimazole Cream 1%', 'Clotrimazole', 'DER-9014', 'Dermatology', 'Bayer', 230, 'Tubes', 410, 100, 13, 'Cream', '1%', false],
];

// Co-prescription bundles give the market-basket miner real patterns to find
const BUNDLES = {
  Cardiology: [['Atorvastatin 20mg', 'Aspirin 75mg'], ['Amlodipine 5mg', 'Losartan 50mg'], ['Clopidogrel 75mg', 'Aspirin 75mg', 'Atorvastatin 20mg']],
  'General Medicine': [['Paracetamol 500mg', 'Cetirizine 10mg'], ['Amoxiclav 625mg', 'Paracetamol 500mg'], ['Cough Syrup 100ml', 'Vitamin C 500mg'], ['Paracetamol 500mg', 'Oral Rehydration Salts']],
  Pediatrics: [['Paracetamol 500mg', 'Oral Rehydration Salts'], ['Zinc Sulphate 20mg', 'Oral Rehydration Salts'], ['Amoxiclav 625mg', 'Paracetamol 500mg']],
  Endocrinology: [['Metformin 500mg', 'Atorvastatin 20mg'], ['Metformin 500mg', 'Gliclazide 80mg'], ['Insulin Glargine 100U/ml', 'Blood Glucose Test Strips']],
  Pulmonology: [['Salbutamol Inhaler 100mcg', 'Montelukast 10mg'], ['Prednisolone 5mg', 'Salbutamol Inhaler 100mcg'], ['Azithromycin 500mg', 'Cough Syrup 100ml']],
  Gastroenterology: [['Omeprazole 20mg', 'Ondansetron 4mg'], ['Omeprazole 20mg', 'Oral Rehydration Salts'], ['Ciprofloxacin 500mg', 'Oral Rehydration Salts']],
  Dermatology: [['Hydrocortisone Cream 1%', 'Cetirizine 10mg'], ['Clotrimazole Cream 1%', 'Loratadine 10mg']],
  Orthopaedics: [['Diclofenac 50mg', 'Omeprazole 20mg'], ['Ibuprofen 400mg', 'Omeprazole 20mg'], ['Tramadol 50mg', 'Paracetamol 500mg']],
  Anaesthesiology: [['Lidocaine 2% 5ml', 'Paracetamol 500mg']],
  Neurology: [['Paracetamol 500mg', 'Vitamin D3 1000IU'], ['Tramadol 50mg', 'Ondansetron 4mg']],
  'Emergency Medicine': [['Ceftriaxone 1g Injectable', 'Paracetamol 500mg'], ['Ondansetron 4mg', 'Oral Rehydration Salts'], ['Ibuprofen 400mg', 'Paracetamol 500mg']],
};
const DIAGNOSES = {
  Cardiology: ['Essential hypertension', 'Hyperlipidaemia', 'Stable angina', 'Post-MI follow-up'],
  'General Medicine': ['Viral fever', 'Upper respiratory tract infection', 'Acute gastroenteritis', 'Seasonal allergy'],
  Pediatrics: ['Childhood diarrhoea', 'Viral fever', 'Acute otitis media'],
  Endocrinology: ['Type 2 diabetes mellitus', 'Poorly controlled diabetes', 'Hypothyroidism review'],
  Pulmonology: ['Bronchial asthma', 'Acute bronchitis', 'Community-acquired pneumonia'],
  Gastroenterology: ['Gastritis', 'GERD', 'Acute gastroenteritis'],
  Dermatology: ['Atopic dermatitis', 'Tinea corporis', 'Contact dermatitis'],
  Orthopaedics: ['Lower back pain', 'Osteoarthritis knee', 'Ankle sprain'],
  Anaesthesiology: ['Pre-operative assessment'],
  Neurology: ['Migraine', 'Tension-type headache', 'Peripheral neuropathy'],
  'Emergency Medicine': ['Acute pyelonephritis', 'Dehydration', 'Soft tissue injury'],
};
const REASONS = ['Follow-up visit', 'Routine check-up', 'Fever and cough', 'Chest discomfort', 'Medication review', 'Blood sugar review',
  'Persistent headache', 'Skin rash', 'Abdominal pain', 'Joint pain', 'Breathing difficulty', 'Lab report review'];
const DOSAGES = ['1 tablet', '2 tablets', '1 capsule', '5 ml', '2 puffs', 'Apply thinly'];
const FREQS = ['Once daily', 'Twice daily', 'Three times daily', 'At night', 'When required'];

/* ------------------------------------------------------------------ */
async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  console.log('🧹 Dropping database…');
  await db.dropDatabase();
  await Promise.all(Object.values(m).map((Model) => Model.syncIndexes()));

  const hash = await bcrypt.hash(PASSWORD, 12);

  /* Users + profiles ------------------------------------------------- */
  const userDocs = [{ username: 'admin', email: 'admin@meridian.health', passwordHash: hash, role: 'admin', lastLogin: new Date() }];
  DOCTORS.forEach(([u]) => userDocs.push({ username: `dr.${u}`, email: `${u}@meridian.health`, passwordHash: hash, role: 'doctor' }));
  PHARMACISTS.forEach(([u]) => userDocs.push({ username: `pharm.${u}`, email: `${u}@meridian.health`, passwordHash: hash, role: 'pharmacist' }));
  SUPPLIERS.forEach(([u]) => userDocs.push({ username: `supp.${u}`, email: `${u}@supplier.com`, passwordHash: hash, role: 'supplier' }));
  PATIENTS.forEach(([u]) => userDocs.push({ username: `pt.${u}`, email: `${u}@email.com`, passwordHash: hash, role: 'patient' }));
  userDocs.find((u) => u.username === 'pharm.tharaka').isActive = false; // one deactivated account to demo the toggle
  const users = await m.User.insertMany(userDocs);
  const userBy = new Map(users.map((u) => [u.username, u]));

  const doctors = await m.Doctor.insertMany(DOCTORS.map(([u, fn, ln, spec, lic, exp, fee, days, room], i) => ({
    user: userBy.get(`dr.${u}`)._id, firstName: fn, lastName: ln, specialization: spec, licenseNumber: lic,
    phone: `07712340${String(i + 1).padStart(2, '0')}`, experienceYears: exp, consultationFee: fee, availableDays: days, room,
    bio: `${spec} consultant with ${exp} years of clinical practice.`,
  })));
  const pharmacists = await m.Pharmacist.insertMany(PHARMACISTS.map(([u, fn, ln, shift], i) => ({
    user: userBy.get(`pharm.${u}`)._id, firstName: fn, lastName: ln, shift,
    licenseNumber: `PHARM-20${17 + (i % 8)}-${String(i + 1).padStart(3, '0')}`, phone: `07712350${String(i + 1).padStart(2, '0')}`,
  })));
  const suppliers = await m.Supplier.insertMany(SUPPLIERS.map(([u, company, contact, address, rating], i) => ({
    user: userBy.get(`supp.${u}`)._id, companyName: company, contactPerson: contact, address, rating,
    phone: `0112345${String(i + 1).padStart(3, '0')}`, email: `orders@${u}.lk`, licenseNumber: `NMRA-SUP-${String(i + 1).padStart(3, '0')}`,
  })));
  const patients = await m.Patient.insertMany(PATIENTS.map(([u, fn, ln, dob, gender, blood], i) => ({
    user: userBy.get(`pt.${u}`)._id, firstName: fn, lastName: ln, dateOfBirth: new Date(dob), gender, bloodGroup: blood,
    phone: `07111000${String(i + 1).padStart(2, '0')}`, address: `${int(5, 220)}/${pick(['A', 'B', '1', '3'])}, ${pick(TOWNS)}`,
    emergencyContact: `${pick(['Nishani', 'Sampath', 'Kumari', 'Nadeeka', 'Pushpa', 'Ajith', 'Sunethra'])} ${ln}`,
    emergencyPhone: `07111001${String(i + 1).padStart(2, '0')}`,
    allergies: chance(0.2) ? pick(['Penicillin', 'Sulfa drugs', 'Latex', 'NSAIDs']) : undefined,
  })));
  console.log(`👥 ${users.length} users · ${doctors.length} doctors · ${pharmacists.length} pharmacists · ${suppliers.length} suppliers · ${patients.length} patients`);

  /* Medicines --------------------------------------------------------- */
  const medicines = await m.Medicine.insertMany(MEDICINES.map(([name, generic, sku, category, maker, price, unit, stock, reorder, expM, form, strength, rx], i) => ({
    name, genericName: generic, sku: `SKU-${sku}`, category, manufacturer: maker, unitPrice: price, unit,
    stockQuantity: stock, reorderLevel: reorder, expiryDate: monthsFromNow(expM), dosageForm: form, strength,
    requiresPrescription: rx, batchNumber: `BTH-${TODAY.getUTCFullYear()}-${String(90 + i * 23).padStart(3, '0')}`,
    description: `${generic} ${strength} — ${form.toLowerCase()}.`,
  })));
  const medBy = new Map(medicines.map((x) => [x.name, x]));
  console.log(`💊 ${medicines.length} medicines`);

  /* Appointments: 180 days history + today + upcoming ------------------ */
  const apptDocs = [];
  const taken = new Set();
  const addAppt = (doctor, patient, day, status) => {
    for (let tries = 0; tries < 20; tries += 1) {
      const time = pick(SLOTS);
      const key = `${doctor._id}|${day.toISOString()}|${time}`;
      if (taken.has(key)) continue;
      taken.add(key);
      const doc = { patient: patient._id, doctor: doctor._id, appointmentDate: day, appointmentTime: time, status, reason: pick(REASONS),
        createdAt: new Date(day.getTime() - int(1, 10) * DAY_MS) };
      if (status === 'Completed') { doc.completedAt = new Date(day.getTime() + 10 * 3600 * 1000); }
      apptDocs.push(doc);
      return doc;
    }
    return null;
  };
  for (let d = 180; d >= 1; d -= 1) {
    const day = daysFromNow(-d);
    const n = int(1, 3) + (d < 60 ? 1 : 0);        // slightly busier recently
    for (let k = 0; k < n; k += 1) {
      const r = rand();
      addAppt(pick(doctors), pick(patients), day, r < 0.84 ? 'Completed' : r < 0.93 ? 'Cancelled' : 'No-Show');
    }
  }
  const silva = doctors[0];
  const fernando = doctors[1];
  [0, 1, 2, 3, 4].forEach((i) => addAppt(silva, patients[i], TODAY, i === 4 ? 'Completed' : 'Scheduled'));
  [5, 6, 7].forEach((i) => addAppt(fernando, patients[i], TODAY, 'Scheduled'));
  [8, 9].forEach((i) => addAppt(pick(doctors.slice(2)), patients[i], TODAY, 'Scheduled'));
  for (let k = 0; k < 28; k += 1) addAppt(pick(doctors), pick(patients), daysFromNow(int(1, 21)), 'Scheduled');
  addAppt(silva, patients[0], daysFromNow(3), 'Scheduled');
  const appointments = await m.Appointment.insertMany(apptDocs);
  console.log(`📅 ${appointments.length} appointments`);

  /* Prescriptions for completed visits -------------------------------- */
  const doctorById = new Map(doctors.map((d) => [String(d._id), d]));
  const rxDocs = [];
  appointments.filter((a) => a.status === 'Completed' && chance(0.85)).forEach((a) => {
    const doc = doctorById.get(String(a.doctor));
    const bundle = [...pick(BUNDLES[doc.specialization])];
    if (chance(0.25)) bundle.push(pick(['Vitamin C 500mg', 'Paracetamol 500mg', 'Vitamin D3 1000IU', 'Folic Acid 5mg']));
    const names = [...new Set(bundle)];
    const ageDays = Math.round((TODAY - a.appointmentDate) / DAY_MS);
    rxDocs.push({
      appointment: a._id, patient: a.patient, doctor: a.doctor, diagnosis: pick(DIAGNOSES[doc.specialization]),
      notes: chance(0.4) ? pick(['Review in two weeks', 'Increase fluid intake', 'Avoid oily food', 'Rest for 3 days', 'Repeat labs next visit']) : undefined,
      issuedDate: a.appointmentDate, validUntil: new Date(a.appointmentDate.getTime() + 30 * DAY_MS),
      status: ageDays <= 2 ? 'Active' : ageDays > 30 && chance(0.1) ? 'Expired' : 'Fulfilled',
      items: names.map((n) => {
        const med = medBy.get(n);
        const unitish = ['Inhalers', 'Bottles', 'Tubes', 'Pens'].includes(med.unit);
        return { medicine: med._id, quantity: unitish ? int(1, 2) : int(10, 30), dosage: pick(DOSAGES), frequency: pick(FREQS), durationDays: pick([3, 5, 7, 14, 30]) };
      }),
    });
  });
  const prescriptions = await m.Prescription.insertMany(rxDocs);
  console.log(`📝 ${prescriptions.length} prescriptions`);

  /* Sales: fulfilled prescriptions + walk-in OTC sales --------------- */
  const saleDocs = [];
  const line = (med, qty, price = med.unitPrice) => ({ medicine: med._id, quantity: qty, unitPrice: price, subtotal: +(price * qty).toFixed(2) });
  prescriptions.filter((r) => r.status === 'Fulfilled').forEach((r) => {
    const items = r.items.map((it) => line(medicines.find((x) => String(x._id) === String(it.medicine)), it.quantity));
    saleDocs.push({ pharmacist: pick(pharmacists.slice(0, 10))._id, patient: r.patient, prescription: r._id, items,
      totalAmount: +items.reduce((s, i) => s + i.subtotal, 0).toFixed(2), paymentMethod: pick(['Cash', 'Card', 'Card', 'Insurance', 'Online']),
      department: 'Outpatient Pharmacy', saleDate: new Date(r.issuedDate.getTime() + int(1, 8) * 3600 * 1000) });
  });
  const OTC = medicines.filter((x) => !x.requiresPrescription && x.category !== 'Surgical Supplies' && x.category !== 'Diagnostics');
  for (let d = 180; d >= 1; d -= 1) {
    const respiratorySeason = d < 75 ? 2 : 0;        // rising respiratory demand → forecast shows a trend
    for (let k = 0; k < int(1, 2) + respiratorySeason; k += 1) {
      const items = [];
      const meds = new Set([pick(OTC)]);
      if (respiratorySeason && chance(0.6)) meds.add(medBy.get(pick(['Cough Syrup 100ml', 'Cetirizine 10mg', 'Vitamin C 500mg'])));
      if (chance(0.3)) meds.add(pick(OTC));
      meds.forEach((med) => items.push(line(med, ['Bottles', 'Tubes'].includes(med.unit) ? 1 : int(6, 20))));
      saleDocs.push({ pharmacist: pick(pharmacists.slice(0, 10))._id, patient: chance(0.5) ? pick(patients)._id : undefined, items,
        totalAmount: +items.reduce((s, i) => s + i.subtotal, 0).toFixed(2), paymentMethod: pick(['Cash', 'Cash', 'Card']),
        department: 'Outpatient Pharmacy', saleDate: new Date(daysFromNow(-d).getTime() + int(8, 19) * 3600 * 1000) });
    }
    // ward requisitions (ICU / theatre / lab) — consumables leave the store too
    if (chance(0.45)) {
      const ward = pick([['ICU & Trauma', ['Ceftriaxone 1g Injectable', 'Sterile Luer-Lock Syringe 5mL']], ['Surgery (OR)', ['Propofol 1% 20ml Emulsion', 'Lidocaine 2% 5ml', 'Surgical Gloves (M)']],
        ['Pathology Lab', ['Rapid PCR Diagnostic Assay', 'Blood Glucose Test Strips']], ['General Ward', ['Sterile Luer-Lock Syringe 5mL', 'Paracetamol 500mg']]]);
      const items = ward[1].map((n) => { const med = medBy.get(n); return line(med, med.unitPrice > 1000 ? int(4, 12) : int(40, 160)); });
      saleDocs.push({ pharmacist: pick(pharmacists.slice(0, 10))._id, items, totalAmount: +items.reduce((s, i) => s + i.subtotal, 0).toFixed(2),
        paymentMethod: 'Insurance', department: ward[0], notes: 'Ward requisition', saleDate: new Date(daysFromNow(-d).getTime() + int(7, 20) * 3600 * 1000) });
    }
  }
  const sales = await m.Sale.insertMany(saleDocs);
  console.log(`🧾 ${sales.length} sales`);

  /* Medicine requests ------------------------------------------------- */
  const reqDocs = [
    { requestedBy: silva.user, requestType: 'Internal', medicine: medBy.get('Clopidogrel 75mg')._id, quantityRequested: 300, priority: 'High', reason: 'Cardiac clinic demand is up this month', status: 'Pending' },
    { requestedBy: silva.user, requestType: 'Internal', medicineName: 'Rosuvastatin 10mg', quantityRequested: 200, priority: 'Normal', reason: 'Alternative statin for intolerant patients', status: 'Pending' },
    { requestedBy: fernando.user, requestType: 'Internal', medicine: medBy.get('Doxycycline 100mg')._id, quantityRequested: 150, priority: 'Urgent', reason: 'Leptospirosis prophylaxis season', status: 'Approved', respondedBy: userBy.get('pharm.nimal')._id, responseNotes: 'Reorder placed with MediLine' },
    { requestedBy: doctors[3].user, requestType: 'Internal', medicine: medBy.get('Insulin Glargine 100U/ml')._id, quantityRequested: 40, priority: 'Urgent', reason: 'Stock is below reorder level', status: 'Approved', respondedBy: userBy.get('pharm.kamani')._id },
    { requestedBy: doctors[4].user, requestType: 'Internal', medicine: medBy.get('Montelukast 10mg')._id, quantityRequested: 200, priority: 'Normal', status: 'Fulfilled', respondedBy: userBy.get('pharm.nimal')._id },
    { requestedBy: doctors[6].user, requestType: 'Internal', medicineName: 'Tacrolimus Ointment 0.1%', quantityRequested: 30, priority: 'Low', status: 'Rejected', respondedBy: userBy.get('pharm.kamani')._id, responseNotes: 'Not on the hospital formulary' },
    { requestedBy: userBy.get('pharm.nimal')._id, requestType: 'External', medicine: medBy.get('Absorbable Suture 3-0')._id, quantityRequested: 400, priority: 'Urgent', reason: 'Out of stock — theatre list tomorrow', status: 'Pending' },
    { requestedBy: userBy.get('pharm.nimal')._id, requestType: 'External', medicine: medBy.get('Propofol 1% 20ml Emulsion')._id, quantityRequested: 600, priority: 'High', reason: 'Below reorder level', status: 'Approved', supplier: suppliers[0]._id, respondedBy: suppliers[0].user },
    { requestedBy: userBy.get('pharm.kamani')._id, requestType: 'External', medicine: medBy.get('Insulin Glargine 100U/ml')._id, quantityRequested: 60, priority: 'Urgent', reason: 'Cold-chain item, low stock', status: 'Pending', supplier: suppliers[8]._id },
    { requestedBy: userBy.get('pharm.kamani')._id, requestType: 'External', medicine: medBy.get('Rapid PCR Diagnostic Assay')._id, quantityRequested: 250, priority: 'High', status: 'Pending', supplier: suppliers[7]._id },
    { requestedBy: userBy.get('pharm.nimal')._id, requestType: 'External', medicine: medBy.get('Doxycycline 100mg')._id, quantityRequested: 500, priority: 'Urgent', status: 'Approved', supplier: suppliers[0]._id, respondedBy: suppliers[0].user },
    { requestedBy: userBy.get('pharm.dulani')._id, requestType: 'External', medicine: medBy.get('Salbutamol Inhaler 100mcg')._id, quantityRequested: 120, priority: 'Normal', status: 'Fulfilled', supplier: suppliers[2]._id, respondedBy: suppliers[2].user },
    { requestedBy: userBy.get('pharm.asela')._id, requestType: 'External', medicine: medBy.get('Cough Syrup 100ml')._id, quantityRequested: 300, priority: 'Normal', status: 'Fulfilled', supplier: suppliers[1]._id, respondedBy: suppliers[1].user },
    { requestedBy: userBy.get('pharm.hiruni')._id, requestType: 'External', medicine: medBy.get('HbA1c Reagent Cartridge')._id, quantityRequested: 80, priority: 'High', reason: 'Current batch expired', status: 'Pending' },
    { requestedBy: userBy.get('pharm.asela')._id, requestType: 'External', medicineName: 'Tranexamic Acid 500mg Injection', quantityRequested: 200, priority: 'Normal', status: 'Rejected', supplier: suppliers[9]._id, respondedBy: suppliers[9].user, responseNotes: 'Unable to source this quarter' },
  ];
  const requests = await m.MedicineRequest.insertMany(reqDocs.map((r, i) => ({ ...r, createdAt: daysFromNow(-(15 - i)) })));
  console.log(`📨 ${requests.length} medicine requests`);

  /* Supply orders + matching stock history ---------------------------- */
  const orderDocs = [];
  const historyDocs = [];
  for (let k = 0; k < 24; k += 1) {
    const med = pick(medicines);
    const supplier = pick(suppliers);
    const qty = med.unitPrice > 1000 ? int(40, 200) : int(300, 2500);
    const when = daysFromNow(-int(3, 175));
    const unitCost = +(med.unitPrice * 0.72).toFixed(2);
    orderDocs.push({ supplier: supplier._id, medicine: med._id, quantity: qty, unitCost, totalCost: +(qty * unitCost).toFixed(2),
      batchNumber: `BTH-${when.getUTCFullYear()}-${int(100, 999)}`, expiryDate: monthsFromNow(int(8, 30)), suppliedDate: when,
      status: 'Delivered', receivedBy: pick(users.filter((u) => u.role === 'pharmacist'))._id, createdAt: when, updatedAt: new Date(when.getTime() + DAY_MS) });
    historyDocs.push({ medicine: med._id, changedBy: userBy.get('pharm.nimal')._id, changeType: 'Supply', quantityBefore: Math.max(0, med.stockQuantity - qty),
      quantityChange: qty, quantityAfter: med.stockQuantity, reason: `Supply from ${supplier.companyName}`, changedAt: new Date(when.getTime() + DAY_MS) });
  }
  const propofol = medBy.get('Propofol 1% 20ml Emulsion');
  const doxy = medBy.get('Doxycycline 100mg');
  orderDocs.push(
    { request: requests[7]._id, supplier: suppliers[0]._id, medicine: propofol._id, quantity: 600, unitCost: 1180, totalCost: 708000, batchNumber: `BTH-${TODAY.getUTCFullYear()}-782`, expiryDate: monthsFromNow(14), suppliedDate: daysFromNow(-1), status: 'Shipped', notes: 'Cold-chain not required' },
    { request: requests[10]._id, supplier: suppliers[0]._id, medicine: doxy._id, quantity: 500, unitCost: 108, totalCost: 54000, batchNumber: `BTH-${TODAY.getUTCFullYear()}-815`, expiryDate: monthsFromNow(20), suppliedDate: TODAY, status: 'Shipped' },
    { supplier: suppliers[3]._id, medicine: medBy.get('Surgical Gloves (M)')._id, quantity: 2000, unitCost: 44, totalCost: 88000, suppliedDate: daysFromNow(-2), status: 'Pending', notes: 'Awaiting dispatch' },
    { supplier: suppliers[9]._id, medicine: medBy.get('Lidocaine 2% 5ml')._id, quantity: 300, unitCost: 150, totalCost: 45000, suppliedDate: daysFromNow(-20), status: 'Cancelled', notes: 'Supplier could not meet the date' },
  );
  const orders = await m.SupplyOrder.insertMany(orderDocs);

  // stock_history for recent dispensing (last 30 days) so the activity log is realistic
  sales.filter((s) => s.saleDate > daysFromNow(-30)).forEach((s) => s.items.forEach((it) => {
    const med = medicines.find((x) => String(x._id) === String(it.medicine));
    historyDocs.push({ medicine: it.medicine, changedBy: userBy.get('pharm.kamani')._id, changeType: 'Sale', quantityBefore: med.stockQuantity + it.quantity,
      quantityChange: -it.quantity, quantityAfter: med.stockQuantity, reason: s.department === 'Outpatient Pharmacy' ? 'Dispensed to patient' : `Requisition — ${s.department}`, changedAt: s.saleDate });
  }));
  await m.StockHistory.insertMany(historyDocs);
  console.log(`🚚 ${orders.length} supply orders · ${historyDocs.length} stock movements`);

  /* Notifications + audit logs (history) ------------------------------ */
  const admin = userBy.get('admin');
  const notes = [
    [admin._id, 'Weekly stock report ready', 'The inventory valuation report for last week is available in Reports.', 'Info'],
    [admin._id, 'Deactivated account', 'pharm.tharaka was deactivated after the contract ended.', 'Warning'],
    [userBy.get('pharm.nimal')._id, 'Low stock alert', 'Absorbable Suture 3-0 is out of stock.', 'Stock'],
    [userBy.get('pharm.nimal')._id, 'Expiry warning', 'HbA1c Reagent Cartridge batch has expired. Quarantine and request a replacement.', 'Alert'],
    [userBy.get('pharm.kamani')._id, 'Low stock alert', 'Insulin Glargine 100U/ml is down to 18 pens.', 'Stock'],
    [silva.user, 'Lab results available', 'HbA1c results for Kasun Rajapaksha were uploaded.', 'Info'],
    [silva.user, 'Request update', 'Your Clopidogrel request is waiting for the pharmacy.', 'Info'],
    [fernando.user, 'Request approved', 'Doxycycline 100mg — reorder placed with MediLine.', 'Success'],
    [suppliers[0].user, 'New restock request', 'Propofol 1% 20ml × 600 ampoules.', 'Alert'],
    [suppliers[7].user, 'New restock request', 'Rapid PCR Diagnostic Assay × 250 kits.', 'Alert'],
    [patients[0].user, 'Appointment reminder', 'You have an appointment with Dr. Ashan Silva today.', 'Appointment'],
    [patients[1].user, 'Prescription ready', 'Your prescription is ready to collect at the pharmacy.', 'Info'],
  ];
  await m.Notification.insertMany(notes.map(([user, title, message, type], i) => ({ user, title, message, type, isRead: i % 4 === 3, createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000) })));
  await m.AuditLog.insertMany([
    ...users.slice(0, 12).map((u, i) => ({ user: admin._id, action: 'INSERT', collectionName: 'users', recordId: u._id, newValue: { username: u.username, role: u.role }, createdAt: daysFromNow(-200 + i) })),
    { user: admin._id, action: 'UPDATE', collectionName: 'users', recordId: userBy.get('pharm.tharaka')._id, oldValue: { isActive: true }, newValue: { isActive: false }, createdAt: daysFromNow(-10) },
  ]);

  /* Live operations — exercise procedures & triggers ------------------ */
  console.log('⚙️  Running live procedures so the triggers fire…');
  const nextWorkDay = (doc) => {
    for (let i = 1; i < 14; i += 1) {
      const d = daysFromNow(i);
      if (doc.availableDays.includes(d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }))) return d;
    }
    return daysFromNow(1);
  };
  const free = async (doc, day) => {
    const busy = new Set(await m.Appointment.distinct('appointmentTime', { doctor: doc._id, appointmentDate: day, status: { $ne: 'Cancelled' } }));
    return SLOTS.find((s) => !busy.has(s));
  };
  for (const [doc, pat, reason] of [[silva, patients[2], 'Blood pressure review'], [fernando, patients[3], 'Persistent cough'], [doctors[2], patients[4], 'Vaccination check']]) {
    const day = nextWorkDay(doc);
    await P.spBookAppointment({ patientId: pat._id, doctorId: doc._id, date: day, time: await free(doc, day), reason });
  }
  const nimal = pharmacists[0];
  await P.spIssueMedicine({ pharmacistId: nimal._id, patientId: patients[0]._id, actorUserId: nimal.user,
    items: [{ medicineId: medBy.get('Paracetamol 500mg')._id, quantity: 20 }, { medicineId: medBy.get('Vitamin C 500mg')._id, quantity: 30 }], paymentMethod: 'Cash' });
  // pushes Doxycycline (160 → 148, reorder 150) across the threshold → trg_low_stock_alert
  await P.spIssueMedicine({ pharmacistId: nimal._id, patientId: patients[5]._id, actorUserId: nimal.user,
    items: [{ medicineId: doxy._id, quantity: 12 }], paymentMethod: 'Card' });
  await P.spAdjustMedicineStock({ medicineId: medBy.get('Surgical Gloves (M)')._id, quantity: -40, actorUserId: nimal.user, reason: 'Damaged in storage', changeType: 'Adjust' });
  // supplier delivery confirmed → trg_supply_update_stock → Medicine triggers
  const delivered = orders.find((o) => String(o.medicine) === String(medBy.get('Lidocaine 2% 5ml')._id) && o.status === 'Delivered') || orders[0];
  await m.SupplyOrder.updateOne({ _id: delivered._id }, { $set: { status: 'Shipped' } });
  await m.SupplyOrder.findOneAndUpdate({ _id: delivered._id }, { $set: { status: 'Delivered', receivedBy: nimal.user } }, { new: true, actor: nimal.user });

  const viewNames = await createViews(db);
  console.log(`🔭 Views: ${viewNames.join(', ')}`);

  const counts = await Promise.all(Object.entries(m).map(async ([name, Model]) => `${name}: ${await Model.countDocuments()}`));
  console.log(`\n📊 ${counts.join(' · ')}`);
  console.log(`\n✅ Seed complete. Sign in with any demo account — password: ${PASSWORD}`);
  console.log('   admin@meridian.health · silva@meridian.health · nimal@meridian.health · mediline@supplier.com · kasun@email.com');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
