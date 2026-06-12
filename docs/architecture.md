# BlueMetal Pro — Architecture Guide
<!-- version: 1.29.5 -->

## Overview

BlueMetal Pro is a monorepo containing:

| Package | Path | Runtime |
|---------|------|---------|
| Web dashboard | `apps/web` | Next.js 14, Azure Static Web Apps (Free tier) |
| Mobile app | `apps/mobile` | React Native (Expo 51), iOS + Android |
| Backend API | `backend` | Node.js + Express, Azure Container Apps (Consumption) |
| Shared types | `packages/shared` | Pure TypeScript, zero runtime deps |
| Edge agent | `packages/weighbridge-agent` | Node.js Windows Service |

## Deployment

| Service | Azure Resource | Tier | Notes |
|---------|---------------|------|-------|
| Web dashboard | Static Web Apps | Free | Next.js static export; custom domain `bluemetalpro.in` |
| Backend API | Container Apps | Consumption (min=0, max=3) | Scales to zero when idle; custom domain `api.bluemetalpro.in` |
| Database | PostgreSQL Flexible Server | Burstable B1ms | 1 vCore, 2 GB RAM; suitable for <10 concurrent users |
| Container images | Azure Container Registry | Basic | Auto-pushed by `backend.yml` workflow |

Web URL: `https://bluemetalpro.in`
API base URL: `https://api.bluemetalpro.in`

## Component Diagram

```
   ┌──────────────────────────────────────────────────────────┐
   │                    Azure Cloud                           │
   │                                                          │
   │  ┌──────────────┐   ┌───────────────┐   ┌────────────┐ │
   │  │  Next.js     │   │  Express API  │   │  MediaMTX  │ │
   │  │  Static Web  │──▶│  Container    │   │  Container │ │
   │  │  Apps (Free) │   │  Apps (Node)  │   │  App       │ │
   │  └──────────────┘   └──────┬────────┘   └──────┬─────┘ │
   │                            │  PostgreSQL         │ HLS  │
   │                            ▼                     │      │
   │                    ┌───────────────┐             │      │
   │                    │  PostgreSQL   │             │      │
   │                    │  Flexible     │             │      │
   │                    │  B1ms         │             │      │
   │                    └───────────────┘             │      │
   └──────────────────────────────────────────────────┼──────┘
                                                       │
          On-site network                              │ RTSP
   ┌──────────────────────────────────┐               │
   │                                  │               │
   │  ┌──────────────┐  RS-232        │               │
   │  │  Legacy      │──────────▶ Edge Agent          │
   │  │  Weighbridge │          (Windows Svc)          │
   │  └──────────────┘               │ HTTPS POST     │
   │                                  │ /api/weighbridge/ingest
   │  ┌──────────────┐  HTTP webhook  │               │
   │  │  IP-based    │───────────────▶│               │
   │  │  Weighbridge │               │               │
   │  └──────────────┘               │               │
   │                                  │               │
   │  ┌──────────────┐  RTSP stream   │               │
   │  │  CCTV Cams   │──────────────────────────────▶│
   │  └──────────────┘               │
   └──────────────────────────────────┘
```

## Multi-Tenant Architecture

BlueMetal Pro is a multi-tenant SaaS platform. The data hierarchy is:

```
Tenant (company)
  └── Crusher (plant / unit)
        └── Users (access granted at crusher or tenant level)
```

- A **tenant** is a crusher company (e.g. "BlueMetal Aggregates Pvt Ltd"). Managed by the platform admin.
- A **crusher** is an individual plant within a tenant. All operational data (sales, purchases, quarry, etc.) is scoped to a crusher.
- Users can be granted access at the tenant level (`user_tenant_access` — sees all crushers) or at the individual crusher level (`user_crusher_access` — existing behaviour).

The `platform_admin` role manages tenants and crushers via `/platform`. Regular users never see cross-company data.

## Authentication & Authorization

3-step login flow:

1. `POST /auth/login` — returns `tenants[]` the user can access plus a short-lived temp token. Platform admins receive a full token and skip to `/platform` immediately.
2. `POST /auth/select-tenant` — returns tenant-scoped temp token + `crushers[]` within that tenant.
3. `POST /auth/select-crusher` — returns a full 7-day JWT with `tenant_id`, `tenant_name`, `crusher_id`, `crusher_name`, and resolved `role`.

Single-tenant / single-crusher users are auto-forwarded; the selection screens only appear when there is a choice.

JWT payload fields: `id`, `name`, `email`, `role`, `tenant_id?`, `tenant_name?`, `crusher_id?`, `crusher_name?`

**Roles**

| Technical role | Business name | Access |
|---|---|---|
| `platform_admin` | Super Admin | Full platform — tenant/crusher provisioning via `/platform` |
| `admin` | Admin | Full read/write within a tenant; can view crusher list (read-only) |
| `operations` | Operator | Data entry — sales, purchases, quarry, vehicles, maintenance, ledger, wages |
| `report_viewer` | Partner | Read-only across all modules (owner / external stakeholder) |

Other auth details:
- Custom JWT (HS256), signed with `JWT_SECRET` env var
- Edge agent uses a per-weighbridge `api_key` (UUID stored in `weighbridges.api_key`)
- Sessions stored in `user_sessions` table; logout revokes server-side

## Database

PostgreSQL 15 on Azure Flexible Server. Migrations in `database/migrations/` — append-only, idempotent (`IF NOT EXISTS`). Run in numbered order.

Key tables:
- `tenants` — company/organisation (migration 014)
- `users`, `user_sessions` — auth
- `user_tenant_access` — user granted access to all crushers within a tenant
- `user_crusher_access` — user granted access to a specific crusher
- `crushers` — plants; each has a `tenant_id` FK (migration 014)
- `products`, `parties`, `vehicles` — master data
- `sales`, `sale_items`, `purchases`, `purchase_items` — transactions
- `ledger_transactions` — double-entry ledger
- `weighbridges`, `weighbridge_live`, `weigh_tickets` — hardware integration
- `cameras` — CCTV stream registry
- `assets`, `maintenance_records` — maintenance
- `workers`, `attendance`, `wage_payments` — payroll
- `quarry_sales` — quarry-specific transactions

## Weighbridge Integration

See [hardware-setup.md](./hardware-setup.md) for detailed setup.

Two ingestion paths:
1. **Legacy RS-232** → Edge Agent reads serial port → POST to `/api/weighbridge/ingest`
2. **IP-based / cloud** → Direct webhook POST to `/api/weighbridge/ingest`

Live weight is stored in `weighbridge_live` (one row per device, upserted). Stable readings auto-save a `weigh_ticket`. Web dashboard connects to local edge agent WebSocket (ws://localhost:8765) for sub-second live display; falls back to 3s polling via cloud API.

## CCTV / Camera Integration

RTSP streams from IP cameras are transcoded to HLS by MediaMTX running as an Azure Container App. The backend registers stream paths via MediaMTX's REST API at startup. Web and mobile apps consume HLS `.m3u8` URLs using `hls.js` (web) and `expo-av` (mobile).

## Push Notifications

Azure Notification Hubs wraps FCM (Android) and APNs (iOS). The backend sends notifications via the `@azure/notification-hubs` SDK. FCM tokens are stored per-user on login from the mobile app.

## Invoice Generation

PDFKit generates A4 GST invoices in-memory. Invoices are uploaded to Azure Blob Storage and a signed URL is returned to the client. Invoice numbering: `INV/YYZZ/NNNN` (financial year, sequential counter stored in `company_config`).
