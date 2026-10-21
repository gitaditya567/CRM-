# TeamInspire CRM

Internal CRM and inventory system for TeamInspire Business Solutions: leads, quotations / proforma invoices (PI), purchase orders, dispatch, stock and client management in one web app.

## Modules

| Module | What it does |
|---|---|
| **Dashboards** | Admin dashboard, sales dashboard and a full-screen Master Dashboard with live updates (Socket.io). |
| **Leads** | Lead pipeline, client & group management, quotations and PIs (PDF / Excel export). |
| **PO Management** | Inward PO (from a PI), Inward Invoice, Dispatch Management and Outward PO. Gmail-style star markers on Inward POs. |
| **Dispatch notifications** | Dispatch email (SMTP) and WhatsApp (Meta Cloud API) with Sent / Delivered / Read / Failed status, history and retry. Optional auto-send when dispatch details are saved. |
| **Reports** | Sidebar *Reports* section. Currently: **Completed History** (fully dispatched / completed POs). |
| **Products & Stock** | Add / edit products, live stock, stock ledger (IN / OUT entries) and Product History. |
| **Clients** | Clients grouped by group (e.g. Dealers), secret / visible clients per user. |
| **Staff & Permissions** | Staff accounts, roles and menu / module permissions. |
| **Travel & Expenses** | Placeholder tab (admin only), module in planning. |
| **Developer Desk** | Internal requests to the developer. |

User roles: `admin`, `SuperAdmin`, `sales`, `services`, `staff`. PO Management, Reports and Travel & Expenses are admin / SuperAdmin only.

## Tech stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, React Router 7, Recharts, Framer Motion, PWA (`vite-plugin-pwa`)
- **Backend:** Node.js + Express 4, MongoDB (Mongoose 8), JWT auth, Socket.io, Nodemailer, PDFKit, ExcelJS
- **Node.js:** 18+ required (the backend uses the built-in `fetch`)

## Project structure

```
CRM_Teaminspire/
├── backend/
│   ├── server.js          # Express app, routes, Socket.io, DB connection
│   ├── controllers/       # Business logic (po, product, client, communication, ...)
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes, mounted under /api/*
│   ├── middleware/        # Auth (protect / adminOnly)
│   ├── services/          # External services (WhatsApp Cloud API)
│   ├── scripts/           # One-off maintenance / data-fix scripts
│   └── .env.example       # Environment variable reference
└── frontend/
    └── src/
        ├── pages/         # Screens (Leads, POManagement, AddProduct, Reports, ...)
        ├── components/    # Layout (Sidebar), shared UI, product form, PO components
        ├── config/        # reports.js — registry of Reports
        └── api/api.js     # Axios instance + API base URL
```

## Getting started (local)

Prerequisites: Node.js 18+, a MongoDB database (Atlas or local).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev               # nodemon; or: npm start
```

On first start the server creates an admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if none exists.

> **Note:** if `ADMIN_PASSWORD` is set, the admin password is reset to it on every server start. A password changed from the UI will not survive a restart.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # https://localhost:5173 (self-signed certificate)
```

On `localhost` the frontend calls `http://localhost:5000/api` by default. If the backend runs on another port, create `frontend/.env.local` (git-ignored):

```env
VITE_API_URL=http://localhost:5010/api
```

> On the main dev machine the backend uses `PORT=5010`, because port 5000 is used by another project. If login shows **"Invalid credentials"** for correct details, the frontend is most likely calling the wrong port.

## Environment variables (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign login tokens |
| `PORT` | No | Backend port (default `5000`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No | Default admin account (see note above) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | For email | Dispatch email sending |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp | Meta Cloud API credentials |
| `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANG` | Recommended | Approved dispatch template (6 body variables) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` / `WHATSAPP_APP_SECRET` | For WhatsApp status | Webhook verification and signature check |

See [`backend/.env.example`](backend/.env.example) for the full list. **Never commit `.env` files or credentials.**

Frontend (build time): `VITE_API_URL` sets the API base URL. If it is not set, production uses the relative path `/api`.

## WhatsApp setup (Meta Cloud API)

1. Create a Meta Business account and app, then add the **WhatsApp** product and register the company number.
2. Create a **System User permanent token** and note the **Phone number ID**.
3. Get a message template approved with these body variables, in this order:
   `{{1}}` client name, `{{2}}` PO no, `{{3}}` transporter, `{{4}}` tracking no, `{{5}}` dispatch date, `{{6}}` items.
4. Webhook callback URL: `https://<api-domain>/api/communications/whatsapp/webhook`. Subscribe to the **messages** field.
5. Fill in the `WHATSAPP_*` variables and restart the backend.

Without these settings, the WhatsApp button falls back to opening WhatsApp Web (no status tracking).

## Scripts

| Location | Command | Purpose |
|---|---|---|
| backend | `npm run dev` | Start API with auto-reload |
| backend | `npm start` | Start API (production) |
| backend | `npm run create-admin` | Create an admin user |
| frontend | `npm run dev` | Dev server |
| frontend | `npm run build` | Production build to `frontend/dist` |
| frontend | `npm run lint` | ESLint |

### Data-fix scripts (`backend/scripts/`)

One-off scripts for data corrections (PO reverts, client merges, price / model changes). Conventions:

- Inspect read-only first, then change.
- Every data-changing script writes a `backup_*.json` of the touched documents before changing anything.
- Changes run inside a MongoDB transaction (all or nothing).
- **`backup_*.json` files contain client / PO data. Do not commit them.**

Run with: `node scripts/<script-name>.js` (from `backend/`).

## Deployment

- `render.yaml`: Render blueprint (backend web service + static frontend).
- `nginx-websocket-config.txt`: sample Nginx reverse-proxy config with WebSocket support for Socket.io.

After pulling new code on the server:

- **Frontend changes:** `npm run build` in `frontend/`.
- **Backend changes:** restart the Node process. This is required for new API routes, models and `.env` changes.
- Socket.io needs WebSocket upgrade headers in the reverse proxy.

---

Developed by Aditya Sharma.
