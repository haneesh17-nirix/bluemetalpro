# Changelog

## [1.10.0] — 2026-06-10


### Features

- `notifications` real-time SSE pipeline — fan-out on all business events ([54052e0])

### Bug Fixes

- `topbar` use default api import and type unread-count response ([2bddb8d])
- `wages` remove orphaned main/div closing tags causing TS error ([4bcbecb])

### Chores

- sync check.sh required-files list to include migration 006 ([1f92eb8])

## [1.9.0] — 2026-06-10


### Features

- `ui` full professional redesign — AppLayout + all pages ([6f3d53c])

## [1.8.2] — 2026-06-09


### Bug Fixes

- `auth` handle legacy API response + force backend redeploy ([e7d67b2])

## [1.8.1] — 2026-06-09


### Bug Fixes

- `ui` fix scattered layout + text visibility across web app ([447f150])

## [1.8.0] — 2026-06-09


### Features

- `ui` polish dashboard + sales pages ([3e56d2e])

## [1.7.6] — 2026-06-09


### Bug Fixes

- `release` regenerate lockfile as part of version bump commit ([f71b997])

## [1.7.5] — 2026-06-09


### Chores

- sync lockfile after v1.7.4 version bump ([2cfe073])

## [1.7.4] — 2026-06-09


### Bug Fixes

- `ts` resolve three TypeScript errors blocking CI ([8ee0df2])

## [1.7.3] — 2026-06-09


### Bug Fixes

- `deps` update lockfile with pino + pino-http + pino-pretty ([843222f])

## [1.7.2] — 2026-06-09


### Bug Fixes

- pino-pretty devDep + crusher access for all users ([bb6151e])

## [1.7.1] — 2026-06-09


### Bug Fixes

- `deps` remove @types/pino-http — pino-http v9 ships its own types ([4eea3c8])

## [1.7.0] — 2026-06-09


### Features

- multi-crusher support with 2-step login and per-crusher data scoping ([ef509da])

## [1.6.2] — 2026-06-09


### Features

- `ci` automated testing, doc sync, and deployment process ([dc1150c])

### Bug Fixes

- `mobile` remove unused native deps causing Gradle failure ([119e759])
- `mobile` fix EAS monorepo install + release workflow branch protection ([dd3a30b])
- `ci` add infra group to sync_checks.py so infra/main.bicep is tracked ([47279e3])

## [1.6.1] — 2026-06-09


### Bug Fixes

- `mobile` fix EAS build - remove expo-router/victory-native, add App entry ([2b2b8d6])

## [1.6.0] — 2026-06-09


### Features

- `mobile` apply dark brand theme to all remaining screens ([bc12728])

## [1.5.2] — 2026-06-09


### Bug Fixes

- `mobile` add missing assets and fix app.json for EAS build ([ecc06de])

## [1.5.1] — 2026-06-09


### Documentation

- update architecture doc and README to reflect current deployment ([65b9095])

## [1.5.0] — 2026-06-09


### Features

- `mobile` apply BlueMetal Pro brand theme to React Native app ([f4fce41])

## [1.4.0] — 2026-06-09


### Features

- `web` full dark UI redesign matching BlueMetal Pro brand ([64c228c])

## [1.3.1] — 2026-06-09


### Bug Fixes

- `mobile` link EAS project haneesh17/bluemetal-pro ([a5b9e19])

## [1.3.0] — 2026-06-09


### Features

- test accounts, mobile EAS, commitlint, branch protection ([d1df81b])

## [1.2.9] — 2026-06-09


### Bug Fixes

- `db` use CREATE OR REPLACE VIEW for idempotent migration ([41f4c5b])

## [1.2.8] — 2026-06-09


### Bug Fixes

- `db` add IF NOT EXISTS to CREATE INDEX statements ([2492681])

## [1.2.7] — 2026-06-09


### Bug Fixes

- `db` use ON CONFLICT DO NOTHING for seed data inserts ([3fffa69])

## [1.2.6] — 2026-06-09


### Bug Fixes

- `db` make migrations idempotent (IF NOT EXISTS on types and tables) ([f2fd6df])

## [1.2.5] — 2026-06-09


### Bug Fixes

- `ci` upgrade az CLI before postgres firewall steps ([89a2460])

## [1.2.4] — 2026-06-09


### Bug Fixes

- `ci` use short flags for az postgres flexible-server commands ([ec5445e])

## [1.2.3] — 2026-06-09


### Bug Fixes

- `web` add root page.tsx redirect → /login for SWA static export ([526d74e])

## [1.2.2] — 2026-06-09


### Bug Fixes

- `ci` install only relevant workspaces to avoid mobile native deps ([d622a66])

## [1.2.1] — 2026-06-09


### Bug Fixes

- `ci` run npm ci from repo root (workspace lockfile) ([d482503])

## [1.2.0] — 2026-06-09


### Features

- deploy web dashboard + auto-release pipeline ([9468722])

### Bug Fixes

- `ci` fix release.yml YAML syntax - git commit multiline message ([d33d882])
- Dockerfile CMD path + backend workflow for Container Apps ([fb3cbc2])

### Other Changes

- Azure Container Apps infrastructure + CI updates ([3fb2055])
- Remove Python cache files and add __pycache__ to .gitignore ([8fd7632])
- Initial commit: BlueMetal Pro monorepo ([67faf48])

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
