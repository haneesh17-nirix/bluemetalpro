# BlueMetal Pro

Full-stack ERP for quarry and stone crushing operations — React Native mobile app (iOS + Android) + Next.js web dashboard.

**Production:** [https://bluemetalpro.in](https://bluemetalpro.in)

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Web dashboard | Next.js 14 (static export) | Azure Static Web Apps → [bluemetalpro.in](https://bluemetalpro.in) |
| Mobile app | React Native, Expo 51 | EAS Build → APK/IPA |
| Backend API | Node.js + Express | Azure Container Apps (Consumption) |
| Database | PostgreSQL 15 | Azure Flexible Server B1ms |
| Storage | Azure Blob Storage | Invoices & documents |
| Push notifications | Azure Notification Hubs | FCM (Android) + APNs (iOS) |

Web: `https://bluemetalpro.in`
API: `https://api.bluemetalpro.in`

## Multi-Tenant Architecture

BlueMetal Pro is a multi-tenant SaaS platform. Hierarchy: **Tenant (company) → Crusher (plant) → Users**.

A platform admin provisions tenants and crushers via `/platform`. Users are granted access at the tenant level (sees all crushers) or at an individual crusher level. The JWT carries `tenant_id` + `crusher_id` after the 3-step login flow: login → select-tenant → select-crusher.

## Modules

| Module | Mobile | Web |
|---|---|---|
| Dashboard / KPIs | ✅ | ✅ |
| Sales + GST Invoices | ✅ | ✅ |
| Purchases | — | ✅ |
| Quarry Sales | ✅ | ✅ |
| Vehicles | ✅ | ✅ |
| Ledger / Receipts | — | ✅ |
| Reports (item-wise, party, GST, trend) | ✅ | ✅ |
| Maintenance (Machinery + Vehicle) | ✅ | ✅ |
| Wages & Attendance | ✅ | ✅ |
| User Management | — | ✅ |
| Company Config / GST Setup | — | ✅ |
| Platform Admin (tenant/crusher mgmt) | — | ✅ |
| Weighbridge Integration | — | ⏳ |
| CCTV Live Cameras | — | ⏳ |

## Roles

| Technical role | Business name | Access |
|---|---|---|
| `platform_admin` | Super Admin | Tenant/crusher provisioning — `/platform` only; no crusher context |
| `admin` | Admin | Full read/write within a tenant; crusher list is read-only |
| `operations` | Operator | Data entry — sales, purchases, quarry, vehicles, maintenance, ledger, wages |
| `report_viewer` | Partner | Read-only across all modules (owner / external stakeholder) |

All roles see all navigation pages. No pages are hidden by role.

## Test Accounts

All passwords: `Test@1234`

| Email | Role | Business name | Notes |
|---|---|---|---|
| platform@bluemetal.local | platform_admin | Super Admin | Lands on `/platform`; manages tenants & crushers; no crusher context |
| admin@bluemetal.local | admin | Admin | Access to Default Company → both demo crushers |
| sales@bluemetal.local | operations | Operator | Access to Default Company → both demo crushers |
| accounts@bluemetal.local | operations | Operator | Access to Default Company → both demo crushers |
| manager@bluemetal.local | operations | Operator | Access to Default Company → both demo crushers |
| operator1@bluemetal.local | operations | Operator | Access to Default Company → both demo crushers |
| operator2@bluemetal.local | operations | Operator | Access to Default Company → both demo crushers |
| maintenance@bluemetal.local | operations | Operator | Access to Default Company → both demo crushers |
| reports@bluemetal.local | report_viewer | Partner | Read-only access to Default Company → both demo crushers |

Login flow: enter credentials → select company (if multiple) → select crusher (if multiple) → dashboard.

## Demo Data

Seeded by `007_seed_test_data.sql`. Demo crushers belong to the **"Default Company"** tenant (created by migration 014).

| Unit | Location | Products | Workers |
|---|---|---|---|
| BlueMetal Quarry Unit 1 | Hosur, TN | M-Sand, P-Sand, 20mm, 40mm, 6mm | 5 |
| BlueMetal Quarry Unit 2 | Salem, TN | M-Sand, P-Sand, 20mm, 40mm, Quarry Dust | 4 |

Each unit has 3 months of sales, purchases, quarry sales, maintenance records, wages, attendance, and ledger entries.

## CI/CD Pipelines

| Workflow | Trigger | What it does |
|---|---|---|
| `web.yml` | Push to `main` | Build Next.js → deploy to Azure Static Web Apps |
| `backend.yml` | Push to `main` | Build Docker image → push to ACR → deploy to Container Apps → run migrations |
| `mobile.yml` | Push to `main` / manual | TypeScript check + EAS build (preview APK) |
| `release.yml` | Push to `main` | Bump version, update CHANGELOG, update arch doc, git tag |
| `pr-checks.yml` | Pull request | Typecheck all packages, contract tests, commitlint |

## Local Development

```bash
# Install all dependencies from repo root
npm install

# Backend
cp backend/.env.example backend/.env
# Fill DB connection string + JWT_SECRET
npm run dev --workspace=backend

# Web dashboard
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > apps/web/.env.local
npm run dev --workspace=apps/web

# Mobile
echo "EXPO_PUBLIC_API_URL=http://localhost:3001/api" > apps/mobile/.env
npm run start --workspace=apps/mobile
```

## Database Migrations

Migrations live in `database/migrations/` and are run automatically by the backend CI pipeline.
To run manually:

```bash
cd backend
npm run migrate
```

All migrations are idempotent — safe to re-run.

## Versioning

Version is managed automatically by the release pipeline using [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` → minor bump
- `fix:` / `perf:` → patch bump
- `BREAKING CHANGE` → major bump

Current version: see [`VERSION`](./VERSION) file.

## Invoice Format

Financial year-based auto-numbering: `INV/2526/0001`
Supports Tax Invoice (CGST+SGST / IGST), Delivery Challan, Bill of Supply.
PDFs generated server-side via PDFKit, stored in Azure Blob Storage.

## Architecture

See [`docs/architecture.md`](./docs/architecture.md) for the full component diagram and integration details.
