# 🏥 Meridian — Healthcare & Inventory Management System

Meridian is a full-stack healthcare and inventory management system built with Next.js 14, Node.js/Express, and Oracle DB (PL/SQL).

## Project Structure

```text
meridian/
├── database/   Oracle PL/SQL schema, triggers, functions, views, procedures, and seed data
├── backend/    Node.js + Express REST API
└── frontend/   Next.js 14 + React + Tailwind CSS app
```

## Requirements

- Node.js 18 or newer
- npm
- Oracle Database with a working service such as `XEPDB1`

## Database Setup

Run the SQL files in this order using SQLcl, SQL Developer, or another Oracle client:

```sql
@database/schema/01_create_tables.sql
@database/triggers/triggers.sql
@database/functions/functions.sql
@database/views/views.sql
@database/procedures/procedures.sql
@database/seeds/sample_data.sql
```

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Update `backend/.env` before starting the server:

```env
PORT=5000
NODE_ENV=development
DB_USER=meridian
DB_PASSWORD=your_password
DB_CONNECT=localhost:1521/XEPDB1
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3000
```

The backend also supports `npm start` for production and `npm test` for the Jest test suite.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Update `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

The frontend also supports `npm run build` and `npm start`.

## Run the App

1. Start Oracle Database and make sure the connection details in `backend/.env` are correct.
2. Run the database scripts to create the schema and load seed data.
3. Start the backend with `npm run dev` inside `backend/`.
4. Start the frontend with `npm run dev` inside `frontend/`.
5. Open `http://localhost:3000` in your browser.

## Demo Credentials

All seeded demo accounts use the password `Password@123`.

| Role       | Email                    |
| ---------- | ------------------------ |
| Admin      | admin@meridian.health    |
| Doctor     | silva@meridian.health    |
| Doctor     | fernando@meridian.health |
| Doctor     | perera@meridian.health   |
| Pharmacist | nimal@meridian.health    |
| Pharmacist | kamani@meridian.health   |
| Supplier   | mediline@supplier.com    |
| Patient    | kasun@email.com          |
| Patient    | malini@email.com         |

## Notes

- The backend API base URL is `http://localhost:5000/api` by default.
- The frontend reads `NEXT_PUBLIC_API_URL` from `.env.local`.
- If you change ports or hostnames, update both environment files accordingly.
