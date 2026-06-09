# BlueMetal Pro — Architecture Guide

## Overview

BlueMetal Pro is a monorepo containing:

| Package | Path | Runtime |
|---------|------|---------|
| Web dashboard | `apps/web` | Next.js 14, Azure Static Web Apps |
| Mobile app | `apps/mobile` | React Native (Expo 51), iOS + Android |
| Backend API | `backend` | Node.js + Express, Azure App Service |
| Shared types | `packages/shared` | Pure TypeScript, zero runtime deps |
| Edge agent | `packages/weighbridge-agent` | Node.js Windows Service |

## Component Diagram

```
   ┌──────────────────────────────────────────────────────────┐
   │                    Azure Cloud                           │
   │                                                          │
   │  ┌──────────────┐   ┌───────────────┐   ┌────────────┐ │
   │  │  Next.js     │   │  Express API  │   │  MediaMTX  │ │
   │  │  Static Web  │──▶│  App Service  │   │  Container │ │
   │  │  Apps        │   │  (Node 20)    │   │  App       │ │
   │  └──────────────┘   └──────┬────────┘   └──────┬─────┘ │
   │                            │  PostgreSQL         │ HLS  │
   │                            ▼                     │      │
   │                    ┌───────────────┐             │      │
   │                    │  PostgreSQL   │             │      │
   │                    │  Flexible     │             │      │
   │                    │  Server       │             │      │
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

## Authentication & Authorization

- Custom JWT (HS256), signed with `JWT_SECRET` env var
- 6 roles: `admin`, `sales_operator`, `accounts`, `report_viewer`, `vehicle_manager`, `quarry_operator`
- Edge agent uses a per-weighbridge `api_key` (UUID stored in `weighbridges.api_key`)
- Sessions stored in `user_sessions` table; logout revokes server-side

## Database

PostgreSQL 15 on Azure Flexible Server. Migrations in `database/migrations/` — append-only, idempotent (`IF NOT EXISTS`). Run in numbered order.

Key tables:
- `users`, `user_sessions` — auth
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
