# Meridian — Healthcare & Inventory Management System (MERN + Next.js)

NSBM Green University · Advanced Database Management Systems · Group assignment 2026

Meridian runs a hospital's clinical workflow (appointments, consultations, prescriptions) and its pharmacy
supply chain (stock, dispensing, requisitions, supplier deliveries) in one application, with role-scoped
dashboards for **Admin, Doctor, Pharmacist, Supplier and Patient**, and a Business-Intelligence module
with three data-mining algorithms.

This is the MERN port of the original Oracle 21c / PL/SQL build. **The Oracle scripts remain the graded
ADBMS deliverable** — every trigger, function, view and procedure has a MongoDB equivalent listed below.

```
meridian-vercel/                one Next.js project → one Vercel deployment
├── src/
│   ├── app/                    Next.js 16 App Router pages (React 19 · Tailwind v4 · shadcn/ui · Untitled UI · Motion)
│   ├── components/ lib/ store/
│   └── pages/api/[...path].ts  bridge: every /api/* request is handed to the Express app
├── server/                     Express 4 · Mongoose 8 · JWT + bcrypt · MongoDB views & transactions
│   ├── app.js                  the Express app (routes, middleware)
│   ├── vercel.js               serverless entry — cached Mongo connection per warm instance
│   ├── server.js               optional standalone API on :5000 (`npm run api`)
│   └── seed/ models/ controllers/ database/ analytics/ …
├── public/
├── package.json                single dependency list for frontend + API
├── .env.example
└── docker-compose.yml          MongoDB 7 single-node replica set (local dev)
```

The frontend calls the API on the same origin (`/api`), so there is no CORS setup and only one URL.

## 1. Requirements

- Node.js 20+ (22 recommended)
- MongoDB **6.0+ running as a replica set** (transactions and `$setWindowFields`, `$dateTrunc`,
  `$dateDiff` need it). Either use the bundled Docker Compose file or a free MongoDB Atlas cluster.

> If MongoDB runs as a plain standalone server, the API still works — the transaction helper detects
> it and runs procedures without a session — but you lose atomicity. Use a replica set for the demo.

## 2. Start MongoDB

**Docker (recommended)**

```bash
docker compose up -d          # waits until the replica set rs0 is initiated
```

**Atlas** — create a cluster, allow your IP, and copy the `mongodb+srv://…` string into `.env`.

**Local install** — start `mongod --replSet rs0`, then once run `mongosh --eval "rs.initiate()"`.

## 3. Run locally

```bash
cp .env.example .env          # set MONGODB_URI and a long JWT_SECRET
npm install
npm run seed                  # drops & rebuilds the database with demo data, creates the 6 views
npm run dev                   # http://localhost:3000  (API: http://localhost:3000/api/health)
```

The seeder inserts well over 10 records per collection (1 admin, 12 doctors, 11 pharmacists,
11 suppliers, 30 patients, 40 medicines, ~180 days of appointments, prescriptions and sales, requests,
supply orders, stock history, notifications, audit logs) and then calls the live procedures so the
triggers fire on real data (a sale that crosses a reorder level, a delivery that restocks, …).

> After editing files in `server/`, restart `npm run dev` — the Express app is cached between reloads.

## 4. Deploy to Vercel

1. **Atlas** → Network Access → add `0.0.0.0/0` (Vercel functions have no fixed IP).
2. Seed the Atlas database once from your machine: `npm run seed` with `MONGODB_URI` pointing at Atlas.
   Vercel never runs the seeder or rebuilds views.
3. Push this folder to GitHub and **Import** it in Vercel. Framework preset: **Next.js**, Root Directory:
   the repo root (leave blank), build/install commands: defaults.
4. Project → Settings → **Environment Variables**: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`
   (do not set `NEXT_PUBLIC_API_URL` — the app uses `/api` on its own domain).
5. Deploy, then open `https://<your-app>.vercel.app/api/health` → `"database": "connected"`.

Or from the CLI: `npm i -g vercel && vercel` (then `vercel env add …` and `vercel --prod`).

### Demo accounts (password `Password@123`)

| Role | Email |
|---|---|
| Admin | admin@meridian.health |
| Doctor | silva@meridian.health |
| Pharmacist | nimal@meridian.health |
| Supplier | mediline@supplier.com |
| Patient | kasun@email.com |

The login page has one-click buttons for each.

## 5. What each role can do

| Role | Features |
|---|---|
| **Admin** | Hospital overview, create / edit users, change roles, activate / deactivate, delete (only if no activity), audit log, all appointments, patients, doctors, stock, sales, purchase orders, full BI |
| **Doctor** | Today's schedule (view), patient records & history, diagnosis notes, prescribe & complete visits, no-show / cancel, book for a patient, request medicines from the pharmacy, clinical insights |
| **Pharmacist** | Inventory overview (the supplied dashboard design), medicine CRUD, stock add/remove with history, low-stock & expiry filters, record multi-item sales, dispense prescriptions, approve/fulfil doctor requests, restock requests to suppliers, confirm deliveries, forecasting / ABC / basket analysis |
| **Supplier** | Open restock requests, accept / decline, dispatch supplies (against a request or unsolicited), delivery history and value |
| **Patient** | Register, book visits with live slot availability, cancel, prescriptions, medical history, find a doctor |
| **Everyone** | Profile, change password, notifications (bell + page), ⌘K quick search |

## 6. Oracle → MongoDB mapping (for the viva)

| Oracle object | MongoDB / Node equivalent | File |
|---|---|---|
| 15 relational tables | 14 collections; `prescription_items` and `sale_items` are embedded arrays (one-to-few, always read with the parent) | `server/models` |
| PK / FK / CHECK / UNIQUE | `_id`, `ref` + populate, schema validators (`min`, `enum`, `required`), unique indexes | models |
| `trg_stock_history_log` | `post('findOneAndUpdate')` on Medicine writes a StockHistory row | `database/triggers.js` |
| `trg_low_stock_alert` | same hook — notifies pharmacists only when stock *crosses* the reorder level | `database/triggers.js` |
| `trg_appointment_notification` | `post('save')` on a new Appointment notifies patient and doctor | `database/triggers.js` |
| `trg_supply_total_cost` | `pre('validate')` computes `totalCost = quantity × unitCost` | `database/triggers.js` |
| `trg_supply_update_stock` | `post('findOneAndUpdate')` on SupplyOrder → Delivered: `$inc` stock, fulfil the request, notify supplier | `database/triggers.js` |
| `trg_audit_log` / `updated_at` triggers | `auditPlugin` (INSERT/UPDATE/DELETE) and `{ timestamps: true }` | `database/triggers.js` |
| `fn_get_patient_age`, `fn_is_medicine_expired`, `fn_days_until_expiry`, `fn_get_medicine_stock_status`, `fn_count_appointments_today`, `fn_get_total_revenue` | JS functions + a reusable `$switch` aggregation expression used inside the views | `database/functions.js` |
| `vw_doctor_schedule_today`, `vw_medicine_stock_report`, `vw_patient_medical_history`, `vw_most_used_medicines`, `vw_supplier_performance`, `vw_daily_revenue_summary` | **Real MongoDB views** created with `db.createCollection(name, { viewOn, pipeline })` | `database/views.js` |
| `sp_book_appointment` | transaction: doctor active, not in the past, consulting day, slot clash | `database/procedures.js` |
| `sp_issue_medicine` | transaction: validate every line, conditional `$inc` (≈ `SELECT … FOR UPDATE`), record sale, fulfil prescription | `database/procedures.js` |
| `sp_adjust_medicine_stock` | transaction with signed quantity; history written by the trigger | `database/procedures.js` |
| `sp_get_most_used_medicines` | aggregation with `$setWindowFields` + `$rank` (≈ `RANK() OVER`) | `database/procedures.js` |
| `sp_create_prescription` | transaction: complete appointment + write prescription + notify | `database/procedures.js` |
| `sp_generate_dashboard_stats` | parallel aggregations in one round trip | `database/procedures.js` |

### BI / data-mining algorithms (`server/analytics/mining.js`)

1. **Demand forecasting** — ordinary least-squares regression on six months of units dispensed per
   medicine; projects next month, days to stock-out, suggested reorder quantity and risk level; R² as confidence.
2. **Market-basket analysis** — Apriori (frequent 1-itemsets, then candidate pairs from frequent items)
   over prescriptions; reports support, confidence and lift for co-prescription rules.
3. **ABC (Pareto) classification** — medicines ranked by revenue; A = first 80 %, B = next 15 %, C = last 5 %.

Plus the "most used medicines" ranking (wow factor) and revenue, appointment and supplier dashboards.

## 7. Frontend design notes

- Visual design follows the supplied dashboard HTML: Plus Jakarta Sans, `#f0f2f5` canvas, `#fbfcfd`
  sidebar, dark `#1e2329` active nav pill, emerald brand scale (`#005944` primary), the green gradient
  "balance" card, the custom bar chart with the `#14171c` tooltip and Monthly/Yearly pill toggle, and the
  activity table with status dots. Tokens live in `src/app/globals.css`.
- **Untitled UI**: `@untitledui/icons` throughout; the sidebar (`components/untitled/`) is adapted from
  Untitled UI React's *sidebar-navigation — sections with subheadings* and *mobile header* components
  (MIT licence, github.com/untitleduico/react) built on `react-aria-components`. The medicine picker uses
  react-aria's ComboBox, the same primitive Untitled UI uses.
- **shadcn/ui**: button, input, select, dialog, dropdown-menu, tabs, table, checkbox, avatar, badge,
  tooltip, skeleton and sonner live in `components/ui/`, themed through the standard shadcn CSS variables.
- State: Zustand (persisted auth + sidebar counters). HTTP: Axios with a JWT request interceptor and a
  401 handler. Animation: Motion (`motion/react`). Charts: Recharts + a hand-built bar chart.

## 8. Useful scripts

| Command | Does |
|---|---|
| `npm run dev` | frontend + API on http://localhost:3000 |
| `npm run seed` | rebuild demo data and views |
| `npm run views` | (re)create the six MongoDB views only |
| `npm run build && npm start` | production build (what Vercel runs) |
| `npm run api` / `npm run api:dev` | optional standalone Express API on :5000 |

## 9. API overview

All routes are under `/api` and, except `/auth/login` and `/auth/register`, need
`Authorization: Bearer <token>`. Role checks are enforced server-side by `authorize(...)`.

`/auth` (login, register, me, profile, change-password) · `/admin/users` (+ toggle, role, audit-logs) ·
`/patients` · `/doctors` · `/suppliers` · `/appointments` (today, availability, status, notes) ·
`/prescriptions` · `/medicines` (alerts, categories, movements, history, stock) · `/sales` ·
`/requests` (respond) · `/supply-orders` (status) · `/notifications` · `/reports` (home, dashboard,
most-used, stock, suppliers, revenue, appointments, daily-patients, consumption, forecast, basket, abc).
