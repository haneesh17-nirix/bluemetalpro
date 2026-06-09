# BlueMetal Pro

Full-stack ERP for quarry and stone crushing operations — React Native mobile app (iOS + Android) + Next.js web dashboard, hosted on Azure.

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Web dashboard | Next.js 14 (static export) | Azure Static Web Apps (Free) |
| Mobile app | React Native, Expo 51 | EAS Build → APK/IPA |
| Backend API | Node.js + Express | Azure Container Apps (Consumption) |
| Database | PostgreSQL 15 | Azure Flexible Server B1ms |
| Storage | Azure Blob Storage | Invoices & documents |
| Push notifications | Azure Notification Hubs | FCM (Android) + APNs (iOS) |

API: `https://bluemetal-prod-api.redflower-fa4e0eb0.eastus2.azurecontainerapps.io/api`

## Modules

| Module | Mobile | Web |
|---|---|---|
| Dashboard / KPIs | ✅ | ✅ |
| Sales + GST Invoices | ✅ | ✅ |
| Purchases | — | ✅ |
| Quarry Sales | ✅ | ✅ |
| Parties (Customer/Supplier) | — | ✅ |
| Vehicles | ✅ | ✅ |
| Ledger / Receipts | — | ✅ |
| Reports (item-wise, party, GST, trend) | ✅ | ✅ |
| Maintenance (Machinery + Vehicle) | ✅ | ✅ |
| Wages & Attendance | ✅ | ✅ |
| User Management | — | ✅ |
| Company Config / GST Setup | — | ✅ |
| Weighbridge Integration | — | ⏳ |
| CCTV Live Cameras | — | ⏳ |

## Roles

| Role | Access |
|---|---|
| `admin` | Full access |
| `sales_operator` | Sales, vehicles, parties |
| `accounts` | Sales, purchases, ledger, wages |
| `report_viewer` | Read-only reports |
| `vehicle_manager` | Vehicles + maintenance |
| `quarry_operator` | Quarry sales only |

## Test Accounts

| Email | Password | Role |
|---|---|---|
| admin@bluemetal.local | Admin@123 | admin |
| sales@bluemetal.local | Sales@123 | sales_operator |
| accounts@bluemetal.local | Accounts@123 | accounts |
| reports@bluemetal.local | Reports@123 | report_viewer |
| vehicle@bluemetal.local | Vehicle@123 | vehicle_manager |
| quarry@bluemetal.local | Quarry@123 | quarry_operator |

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
