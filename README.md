# 🏥 Meridian — Healthcare & Inventory Management System

A full-stack healthcare and inventory management system built with Next.js 14, Node.js/Express, and Oracle DB (PL/SQL).

---

## 📐 Architecture Overview

```
meridian/
├── database/          Oracle PL/SQL (schema, triggers, functions, views, procedures, seeds)
├── backend/           Node.js + Express.js REST API
└── frontend/          Next.js 14 + React + Tailwind CSS + Framer Motion
```

---

## 🗄️ Database (Oracle PL/SQL)

### Tables (15)
| Table | Purpose |
|---|---|
| `users` | All system users (base identity) |
| `patients` | Patient-specific details |
| `doctors` | Doctor-specific details + specialization |
| `pharmacists` | Pharmacist-specific details |
| `suppliers` | Supplier company details |
| `medicines` | Medicine catalog + stock tracking |
| `appointments` | Doctor–patient appointments |
| `prescriptions` | Prescription headers |
| `prescription_items` | Individual prescription medicines |
| `medicine_requests` | Pharmacist → Supplier requests |
| `supply_orders` | Supplier delivery records |
| `sales` | Medicine sales to patients |
| `sale_items` | Line items per sale |
| `notifications` | System-wide notifications |
| `audit_logs` | Immutable audit trail |

### Advanced Database Features

**Triggers (6)**
- `trg_low_stock_alert` — Notifies all pharmacists when medicine stock ≤ reorder level
- `trg_stock_history_log` — Logs every stock change automatically
- `trg_appointment_notification` — Notifies patient + doctor on new appointment
- `trg_sale_update_stock` — Auto-decrements stock on sale
- `trg_supply_update_stock` — Auto-increments stock on delivery
- `trg_*_updated_at` — Timestamp maintenance triggers

**Functions (5)**
- `fn_get_patient_age(dob)` → Age in years
- `fn_get_medicine_stock_status(stock, reorder, expiry)` → Normal/Low/Critical/Expired
- `fn_count_appointments_today(doctor_id)` → Today's appointment count
- `fn_get_total_revenue(start_date, end_date)` → Revenue in date range
- `fn_is_medicine_expired(expiry_date)` → Boolean check

**Views (6)**
- `vw_doctor_schedule_today` — Doctor's appointments for today
- `vw_medicine_stock_report` — Full medicine inventory with status
- `vw_patient_medical_history` — Patient history with doctor info
- `vw_most_used_medicines` ⭐ — **WOW FACTOR**: BI report with rank, revenue, patient count
- `vw_supplier_performance` — Supplier analytics
- `vw_daily_revenue_summary` — Revenue by day

**Stored Procedures (6)**
- `sp_book_appointment` — Books with conflict-checking
- `sp_issue_medicine` — Records sale + decrements stock
- `sp_add_medicine_stock` — Restocks medicine
- `sp_get_most_used_medicines` — REF CURSOR BI procedure
- `sp_create_prescription` — Creates prescription header
- `sp_generate_dashboard_stats` — Dashboard aggregate stats

### Setup
```sql
-- Run in order:
@database/schema/01_create_tables.sql
@database/triggers/triggers.sql
@database/functions/functions.sql
@database/views/views.sql
@database/procedures/procedures.sql
@database/seeds/sample_data.sql
```

---

## 🖥️ Backend (Node.js + Express.js)

### Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Oracle DB credentials
npm run dev
```

### Environment Variables
```
PORT=5000
DB_USER=meridian_user
DB_PASSWORD=your_password
DB_CONNECT=localhost:1521/XEPDB1
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:3000
```

### API Endpoints

**Auth** (`/api/auth`)
- `POST /login` — Login with email + password
- `POST /register` — Patient self-registration
- `GET /me` — Get current user profile
- `POST /change-password` — Change password

**Medicines** (`/api/medicines`)
- `GET /` — List all medicines (with filters)
- `POST /` — Create medicine (pharmacist/admin)
- `GET /low-stock` — Low stock list
- `PATCH /:id/stock` — Update stock

**Appointments** (`/api/appointments`)
- `GET /` — List (role-scoped)
- `POST /` — Book appointment
- `PATCH /:id/status` — Update status
- `GET /today` — Today's appointments

**Reports** (`/api/reports`)
- `GET /dashboard` — Dashboard stats
- `GET /most-used-medicines` — BI report ⭐
- `GET /revenue` — Revenue analytics
- `GET /stock` — Stock report

**Patients, Doctors, Prescriptions, Suppliers, Notifications** — Full CRUD per role

### Authentication
- JWT tokens (24h expiry)
- bcrypt password hashing (10 salt rounds)
- Role-based middleware: `authenticate` + `authorize(...roles)`

---

## 🎨 Frontend (Next.js 14 + Tailwind + Framer Motion)

### Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
```

### Pages

| Route | Description | Roles |
|---|---|---|
| `/login` | Animated login with demo credentials | All |
| `/dashboard` | Role-aware stats + charts | All |
| `/dashboard/appointments` | Book & manage appointments | All |
| `/dashboard/medicines` | Medicine inventory + stock | Admin, Pharmacist |
| `/dashboard/patients` | Patient directory | Admin, Doctor |
| `/dashboard/users` | User management + CRUD | Admin |
| `/dashboard/prescriptions` | Create & view prescriptions | Doctor, Patient |
| `/dashboard/supplier` | Request & supply management | Supplier |
| `/dashboard/reports` | BI analytics dashboard ⭐ | Admin, Doctor |
| `/dashboard/profile` | Profile + password management | All |

### Demo Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@meridian.com | Password@123 |
| Doctor | sarah.chen@meridian.com | Password@123 |
| Pharmacist | lisa.t@meridian.com | Password@123 |
| Supplier | contact@medsupply.com | Password@123 |
| Patient | emily.c@meridian.com | Password@123 |

---

## ⭐ WOW Factor — Most Used Medicines BI Report

The `/dashboard/reports` page features a full Business Intelligence dashboard:
- **Horizontal bar chart** with per-medicine color coding and quantity visualization
- **Ranked table** with medicine name, total prescriptions, unique patients, revenue
- **Category pie chart** for medicine category distribution
- **14-day revenue line chart** with smooth curves
- **Monthly appointments stacked bar chart** (scheduled vs completed)
- Powered by `vw_most_used_medicines` view + `sp_get_most_used_medicines` stored procedure

---

## 🔄 System Flow

```
Patient → Books Appointment
    ↓
Doctor → Views Schedule → Marks Complete → Creates Prescription
    ↓
Pharmacist → Issues Medicine → Updates Stock
    ↓
Supplier → Receives Request → Delivers Medicines → Updates Stock
    ↓
Admin → Monitors Everything via Dashboard
```

---

## 🔒 Security Features

- JWT Authentication (HTTP-only recommended for production)
- bcrypt password hashing (10 rounds)
- Rate limiting (100 req/15min)
- Helmet.js security headers
- CORS configuration
- Role-based access control (RBAC) on every endpoint
- Input validation on all routes
