# Changelog

All notable changes to **BlueMetal Pro** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Entries from v1.2.0 onward are **auto-generated** by `.github/workflows/release.yml`
> on every merge to `main` via `scripts/update_changelog.py`.

---

## [Unreleased]

### Planned
- Offline-first mode for mobile app (PouchDB / SQLite sync)
- Multi-site / multi-plant support
- WhatsApp invoice delivery via Twilio
- Custom report builder

---

## [1.1.0] — 2026-06-09

### Added
- **Weighbridge Integration** — serial (RS-232/USB) and IP/webhook ingestion
  - Edge agent (`packages/weighbridge-agent`) for on-site legacy scales
  - Shared parser utilities for common Indian indicator formats (Avery, Mettler, local brands)
  - Backend webhook endpoint for modern IP-enabled scales
  - Real-time weight push via Azure SignalR to web dashboard
  - Mobile notification on each weigh ticket
- **CCTV / Camera Integration** — RTSP → HLS transcoding pipeline
  - MediaMTX container on Azure Container Apps
  - HLS stream player in mobile app (`CameraFeed` component)
  - Live camera view page in web dashboard
  - Azure VPN/Tailscale tunnel Bicep for secure site-to-cloud connectivity
- **Weighbridge web page** — live weight display, manual override, ticket history
- **Camera web page** — multi-camera grid with stream health indicator
- **Documentation** (`docs/`) — architecture, API reference, hardware setup guides
- **CHANGELOG.md**, **VERSIONING.md**, `.editorconfig`, `.gitignore`
- GitHub Actions `pr-checks.yml` — parallel TS type-check for all packages

### Changed
- App renamed from "Stone Crusher ERP" → **BlueMetal Pro** across all packages
- `package.json` versions bumped to `1.1.0`

---

## [1.0.0] — 2026-06-08

### Added
- Initial monorepo scaffold (backend / web / mobile)
- Azure Bicep IaC — PostgreSQL, App Service, Blob Storage, Notification Hub, Static Web App
- PostgreSQL schema — 15 tables covering all core modules
- **Backend** (Node.js + Express + TypeScript)
  - JWT authentication with role-based access control
  - 15 REST API route modules: auth, sales, purchases, parties, products, vehicles, ledger,
    quarry, maintenance, wages, reports, invoices, config, users, notifications
  - GST-aware PDF invoice generation (PDFKit) with FY-based auto-numbering
  - Azure Blob Storage upload for invoices
  - Azure Notification Hubs push on every sale
- **Web Dashboard** (Next.js 14 + Tailwind)
  - Pages: Login, Dashboard, Sales, Purchases, Parties, Vehicles, Quarry,
    Reports (item/party/GST/trend), Maintenance, Wages & Attendance, Users, Settings
  - Role-filtered sidebar navigation
  - Sales invoice creation modal with live GST calculation
  - PDF download / share
- **Mobile App** (React Native Expo)
  - Screens: Login, Dashboard, Sales list, New Sale, Quarry, Reports,
    Maintenance, Wages & Attendance, Vehicles, Notifications
  - Push notification registration (FCM + APNs via Notification Hubs)
  - Secure token storage (expo-secure-store)
- **CI/CD** — 5 GitHub Actions workflows (backend, web, mobile, infra, pr-checks)
- Pre-loaded product catalog (M-Sand, P-Sand, 20mm Chilli, Dust, GSB, WMM, Bollar)
- 6 user roles: admin, sales_operator, accounts, report_viewer, vehicle_manager, quarry_operator
