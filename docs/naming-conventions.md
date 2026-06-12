# BlueMetal Pro — Naming Conventions

This document is the **single source of truth** for every identifier used across the stack.
Before adding a field, route, or column, check here first. If you add something new, document it here.

---

## 1. General Rules

| Layer | Convention | Example |
|-------|-----------|---------|
| Database columns | `snake_case` | `party_id`, `grand_total`, `is_active` |
| Backend route params | `snake_case` (body + query) | `req.body.party_id`, `req.query.from` |
| Frontend API call params | `snake_case` (matches backend exactly) | `{ party_id, grand_total }` |
| TypeScript interfaces/types | `PascalCase` | `WeighTicket`, `CameraConfig` |
| TypeScript variables/functions | `camelCase` | `getParties()`, `payrollWorker` |
| React components | `PascalCase` | `LiveWeightDisplay`, `ReceiptModal` |
| CSS classes (Tailwind) | `kebab-case` | `text-[#1a3c5e]`, `bg-gray-50` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `NEXT_PUBLIC_API_URL`, `DB_PASSWORD` |
| API route paths | `kebab-case`, plural nouns | `/api/weighbridge/tickets`, `/api/wage-payments` |

**Critical rule:** The frontend sends `snake_case` field names in all HTTP bodies and query strings. The backend reads `snake_case`. Never use `camelCase` in a request body.

---

## 2. API Base URLs

| Context | Variable | Default |
|---------|----------|---------|
| Web (Next.js) | `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` |
| Mobile (Expo) | `EXPO_PUBLIC_API_URL` | `https://YOUR_API_URL/api` |
| Edge agent (Node) | `API_URL` | — (required) |

All API paths in `apps/web/src/lib/api.ts` and `apps/mobile/src/lib/api.ts` are **relative** (no `/api` prefix) because `baseURL` already includes `/api`.

---

## 3. Route Mount Points (backend/src/index.ts)

| Router export | Mounted at | File |
|---------------|-----------|------|
| `authRouter` | `/api/auth` | `routes/auth.ts` |
| `usersRouter` | `/api/users` | `routes/users.ts` |
| `configRouter` | `/api/config` | `routes/config.ts` |
| `productsRouter` | `/api/products` | `routes/products.ts` |
| `partiesRouter` | `/api/parties` | `routes/parties.ts` |
| `vehiclesRouter` | `/api/vehicles` | `routes/vehicles.ts` |
| `salesRouter` | `/api/sales` | `routes/sales.ts` |
| `purchasesRouter` | `/api/purchases` | `routes/purchases.ts` |
| `ledgerRouter` | `/api/ledger` | `routes/ledger.ts` |
| `quarryRouter` | `/api/quarry` | `routes/quarry.ts` |
| `maintenanceRouter` | `/api/maintenance` | `routes/maintenance.ts` |
| `wagesRouter` | `/api/wages` | `routes/wages.ts` |
| `reportsRouter` | `/api/reports` | `routes/reports.ts` |
| `invoicesRouter` | `/api/invoices` | `routes/invoices.ts` |
| `notificationsRouter` | `/api/notifications` | `routes/notifications.ts` |
| `weighbridgeRouter` | `/api/weighbridge` | `routes/weighbridge.ts` |
| `camerasRouter` | `/api/cameras` | `routes/cameras.ts` |

**Rule:** Sub-routes inside a router must NOT repeat the router's own segment. If `wagesRouter` is mounted at `/api/wages`, a sub-route for calculation is `/calculate` — not `/wages/calculate`.

---

## 4. Complete API Endpoint Reference

### Auth — `/api/auth`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| POST | `/login` | `email`, `password`, `fcm_token?` | — | `{ token, user }` |
| GET | `/me` | — | — | `user` object |
| POST | `/change-password` | `current_password`, `new_password` | — | `{ success }` |
| POST | `/logout` | — | — | `{ success }` |

### Sales — `/api/sales`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/` | — | `from`, `to`, `party_id`, `status`, `page`, `limit` | `sale[]` |
| GET | `/:id` | — | — | `sale` |
| POST | `/` | `invoice_type`, `sale_date`, `party_id`, `party_name`, `party_gstin`, `party_address`, `vehicle_id`, `vehicle_number`, `driver_name`, `do_number`, `items[]`, `discount_amount`, `amount_received`, `payment_mode`, `payment_reference`, `notes`, `is_same_state` | — | `sale` |
| PATCH | `/:id/cancel` | — | — | `sale` |
| GET | `/summary/today` | — | — | `{ total_sales, total_collected, total_pending, count }` |

**`items[]` object:**

| Field | Type | Notes |
|-------|------|-------|
| `product_id` | UUID | FK → products.id |
| `product_name` | string | Denormalised copy |
| `unit` | string | MT / CFT / NOS |
| `quantity` | decimal | |
| `rate` | decimal | Per unit |
| `gst_rate` | integer | 0 / 5 / 12 / 18 / 28 |

**`invoice_type` values:** `tax_invoice` · `delivery_challan` · `bill_of_supply`

**`payment_mode` values:** `cash` · `credit` · `cheque` · `upi` · `neft` · `rtgs`

### Purchases — `/api/purchases`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/` | — | `from`, `to`, `party_id`, `page`, `limit` | `purchase[]` |
| GET | `/:id` | — | — | `purchase` |
| POST | `/` | `bill_number`, `purchase_date`, `party_id`, `party_name`, `vehicle_id`, `vehicle_number`, `items[]`, `amount_paid`, `payment_mode`, `notes` | — | `purchase` |

**`items[]` same structure as sales items.**

### Parties — `/api/parties`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/` | — | `type`, `search` | `party[]` |
| GET | `/:id` | — | — | `party` |
| POST | `/` | `name`, `type`, `gstin`, `pan`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `credit_limit`, `opening_balance` | — | `party` |
| PUT | `/:id` | same as POST minus `opening_balance` | — | `party` |
| DELETE | `/:id` | — | — | `{ success }` |

**`type` values:** `customer` · `supplier` · `both`

### Products — `/api/products`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/` | — | — | `product[]` |
| POST | `/` | `name`, `code`, `category`, `unit`, `hsn_code`, `gst_rate`, `default_sale_price`, `default_purchase_price`, `description` | — | `product` |
| PUT | `/:id` | same as POST minus `category` | — | `product` |

**`category` values:** `m_sand` · `p_sand` · `aggregates` · `dust` · `gsb` · `boulder` · `other`

**`unit` values:** `MT` · `CFT` · `NOS` · `KG` · `LOAD`

### Vehicles — `/api/vehicles`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/` | — | — | `vehicle[]` |
| POST | `/` | `registration_number`, `vehicle_type`, `owner_name`, `owner_phone`, `capacity_mt`, `notes` | — | `vehicle` |
| PUT | `/:id` | same as POST + `status` | — | `vehicle` |
| GET | `/:id/trips` | — | `from`, `to` | `sale[]` |

**`status` values:** `active` · `maintenance` · `retired`

### Ledger — `/api/ledger`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| POST | `/receipt` | `party_id`, `txn_date`, `amount`, `payment_mode`, `cheque_number?`, `cheque_date?`, `bank_name?`, `reference_id?`, `narration` | — | `ledger_transaction` |
| GET | `/party/:party_id` | — | `from`, `to` | `ledger_transaction[]` |
| GET | `/balances` | — | — | `party_balance[]` (from view) |

**`txn_type` values (system-set, not user-supplied):** `receipt` · `payment` · `journal`

### Quarry — `/api/quarry`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/` | — | `from`, `to`, `page`, `limit` | `quarry_sale[]` |
| POST | `/` | `sale_date`, `party_id`, `party_name`, `vehicle_id`, `vehicle_number`, `product_id`, `product_name`, `quantity`, `unit`, `rate`, `royalty_rate`, `amount_received`, `payment_mode`, `notes` | — | `quarry_sale` |
| GET | `/summary` | — | `from`, `to` | summary object |

### Maintenance — `/api/maintenance`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/assets` | — | `asset_type` | `asset[]` |
| POST | `/assets` | `asset_type`, `name`, `model`, `serial_number`, `purchase_date`, `purchase_cost`, `vehicle_id?`, `notes` | — | `asset` |
| GET | `/records` | — | `asset_type`, `status`, `asset_id` | `maintenance_record[]` |
| POST | `/records` | `asset_id`, `asset_type`, `title`, `description`, `scheduled_date`, `cost?`, `vendor_name?`, `vendor_phone?`, `parts_replaced?`, `next_service_date?` | — | `maintenance_record` |
| PATCH | `/records/:id` | `status`, `completed_date?`, `cost?`, `parts_replaced?`, `next_service_date?` | — | `maintenance_record` |
| GET | `/upcoming` | — | — | `maintenance_record[]` (next 7 days) |

**`asset_type` values:** `machinery` · `vehicle`

**`status` values:** `scheduled` · `in_progress` · `completed` · `cancelled`

### Wages — `/api/wages`

| Method | Path | Body fields | Query params | Returns |
|--------|------|-------------|--------------|---------|
| GET | `/workers` | — | — | `worker[]` |
| POST | `/workers` | `name`, `phone`, `designation`, `wage_type`, `wage_rate`, `joining_date`, `aadhaar?` | — | `worker` |
| PUT | `/workers/:id` | `name`, `phone`, `designation`, `wage_type`, `wage_rate` | — | `worker` |
| POST | `/attendance/bulk` | `date`, `entries[]` | — | `attendance[]` |
| GET | `/attendance` | — | `date`, `from`, `to`, `worker_id` | `attendance[]` |
| POST | `/calculate` | `worker_id`, `from`, `to` | — | wage calculation |
| POST | `/pay` | `worker_id`, `period_from`, `period_to`, `days_worked`, `gross_wages`, `deductions`, `advances_deducted`, `net_wages`, `payment_date`, `payment_mode`, `notes?` | — | `wage_payment` |

**`wage_type` values:** `daily` · `monthly` · `piece_rate` · `hourly`

**`attendance.entries[]` object:**

| Field | Type |
|-------|------|
| `worker_id` | UUID |
| `status` | `present` \| `absent` \| `half_day` \| `leave` |
| `overtime_hours` | decimal (default 0) |
| `advance` | decimal (default 0) |

### Reports — `/api/reports`

| Method | Path | Query params | Returns |
|--------|------|--------------|---------|
| GET | `/dashboard` | — | `{ today_sales, today_collected, today_pending, maintenance_alerts, top_products[] }` |
| GET | `/item-wise` | `from`, `to` | `{ product_name, total_qty, total_amount }[]` |
| GET | `/party-wise` | `from`, `to`, `type` | party totals |
| GET | `/vehicle-wise` | `from`, `to` | vehicle trip totals |
| GET | `/gst-summary` | `from`, `to` | GSTR-1 style summary |
| GET | `/monthly-trend` | — | last 12 months `{ month, total_sales }[]` |
| GET | `/ledger/:party_id` | `from`, `to` | ledger report for party |

### Invoices — `/api/invoices`

| Method | Path | Body fields | Returns |
|--------|------|-------------|---------|
| GET | `/:sale_id/pdf` | — | PDF blob (Content-Type: application/pdf) |
| POST | `/:sale_id/upload` | — | `{ url }` (Azure Blob SAS URL) |

### Weighbridge — `/api/weighbridge`

| Method | Path | Auth | Body fields | Query params | Returns |
|--------|------|------|-------------|--------------|---------|
| POST | `/ingest` | API key (no JWT) | `weighbridgeId`, `apiKey`, `weight{ value, status, raw, unit }`, `vehicleNumber?` | — | `{ success }` |
| GET | `/` | JWT | — | — | `weighbridge[]` with live state joined |
| POST | `/` | JWT admin | `name`, `type`, `com_port?`, `baud_rate?`, `ip_address?`, `ip_port?`, `max_capacity_kg`, `location_label`, `sort_order` | — | `weighbridge` |
| GET | `/tickets` | JWT | — | `from`, `to`, `weighbridge_id`, `page`, `limit` | `weigh_ticket[]` |
| POST | `/tickets` | JWT | `weighbridge_id`, `vehicle_id?`, `vehicle_number?`, `party_id?`, `party_name?`, `product_id?`, `product_name?`, `gross_weight_kg`, `tare_weight_kg`, `notes?` | — | `weigh_ticket` |
| PATCH | `/tickets/:id/link-sale` | JWT | `sale_id` | — | `weigh_ticket` |
| GET | `/:id/live` | JWT | — | — | `{ weight_kg, status, vehicle_number, captured_at }` |

**`weighbridge.type` values:** `serial` · `ip` · `cloud`

**`weight.status` values:** `stable` · `unstable` · `overload` · `error` · `unknown`

### Cameras — `/api/cameras`

| Method | Path | Body fields | Returns |
|--------|------|-------------|---------|
| GET | `/` | — | `camera[]` |
| POST | `/` | `name`, `location_label?`, `rtsp_url`, `sort_order` | `camera` (with `hls_url` populated) |
| PUT | `/:id` | `name`, `location_label`, `rtsp_url`, `sort_order`, `is_active` | `camera` |
| GET | `/health` | — | `{ cameraId, name, status }[]` |
| GET | `/:id/snapshot` | — | `{ snapshot_url }` |

### Users — `/api/users`

| Method | Path | Body fields | Returns |
|--------|------|-------------|---------|
| GET | `/` | — | `user[]` (no password_hash) |
| POST | `/` | `name`, `email`, `phone?`, `role`, `password` | `user` |
| PUT | `/:id` | `name`, `phone`, `role`, `is_active` | `user` |
| POST | `/:id/reset-password` | `password` | `{ success }` |

### Notifications — `/api/notifications`

| Method | Path | Body fields | Returns |
|--------|------|-------------|---------|
| GET | `/` | — | `notification[]` |
| PATCH | `/:id/read` | — | `notification` |
| POST | `/mark-all-read` | — | `{ success }` |
| POST | `/register-device` | `fcm_token`, `device_info?` | `{ success }` |

### Config — `/api/config`

| Method | Path | Body fields | Returns |
|--------|------|-------------|---------|
| GET | `/` | — | `company_config` |
| PUT | `/` | `company_name`, `gstin`, `pan`, `address`, `city`, `state`, `pincode`, `phone`, `email`, `bank_name`, `bank_account`, `bank_ifsc`, `bank_branch`, `invoice_prefix`, `quarry_invoice_prefix`, `terms_conditions` | `company_config` |

---

## 5. Database Tables and Column Names

### `users`
`id` · `name` · `email` · `phone` · `password_hash` · `role` · `is_active` · `created_at` · `updated_at`

**`role` enum:** `platform_admin` · `admin` · `operations` · `report_viewer`

### `user_sessions`
`id` · `user_id` · `token_hash` · `fcm_token` · `expires_at` · `created_at`

### `company_config`
`id` · `company_name` · `gstin` · `pan` · `address` · `city` · `state` · `pincode` · `phone` · `email` · `bank_name` · `bank_account` · `bank_ifsc` · `bank_branch` · `invoice_prefix` · `invoice_counter` · `quarry_invoice_prefix` · `quarry_invoice_counter` · `weighbridge_ticket_counter` · `terms_conditions` · `is_same_state`

### `products`
`id` · `name` · `code` · `category` · `unit` · `hsn_code` · `gst_rate` · `default_sale_price` · `default_purchase_price` · `description` · `is_active` · `created_at` · `updated_at`

### `parties`
`id` · `name` · `type` · `gstin` · `pan` · `phone` · `email` · `address` · `city` · `state` · `pincode` · `credit_limit` · `opening_balance` · `is_active` · `created_at` · `updated_at`

### `vehicles`
`id` · `registration_number` · `vehicle_type` · `owner_name` · `owner_phone` · `capacity_mt` · `status` · `notes` · `is_active` · `created_at` · `updated_at`

### `sales`
`id` · `invoice_number` · `invoice_type` · `sale_date` · `party_id` · `party_name` · `party_gstin` · `party_address` · `vehicle_id` · `vehicle_number` · `driver_name` · `do_number` · `subtotal` · `discount_amount` · `taxable_amount` · `cgst_amount` · `sgst_amount` · `igst_amount` · `total_tax` · `grand_total` · `amount_received` · `payment_mode` · `payment_reference` · `balance_due` · `status` · `notes` · `created_by` · `created_at` · `updated_at`

**`status` values:** `active` · `cancelled`

### `sale_items`
`id` · `sale_id` · `product_id` · `product_name` · `unit` · `quantity` · `rate` · `amount` · `gst_rate` · `cgst_amount` · `sgst_amount` · `igst_amount` · `total_amount`

### `purchases`
`id` · `bill_number` · `purchase_date` · `party_id` · `party_name` · `vehicle_id` · `vehicle_number` · `subtotal` · `grand_total` · `amount_paid` · `payment_mode` · `balance_due` · `notes` · `created_by` · `created_at` · `updated_at`

### `purchase_items`
`id` · `purchase_id` · `product_id` · `product_name` · `unit` · `quantity` · `rate` · `amount` · `gst_rate` · `total_amount`

### `ledger_transactions`
`id` · `txn_type` · `txn_date` · `party_id` · `amount` · `payment_mode` · `cheque_number` · `cheque_date` · `bank_name` · `reference_id` · `reference_type` · `narration` · `created_by` · `created_at`

### `quarry_sales`
`id` · `invoice_number` · `sale_date` · `party_id` · `party_name` · `vehicle_id` · `vehicle_number` · `product_id` · `product_name` · `quantity` · `unit` · `rate` · `amount` · `royalty_rate` · `royalty_amount` · `grand_total` · `amount_received` · `payment_mode` · `balance_due` · `notes` · `created_by` · `created_at` · `updated_at`

### `assets`
`id` · `asset_type` · `name` · `model` · `serial_number` · `purchase_date` · `purchase_cost` · `vehicle_id` · `notes` · `is_active` · `created_at` · `updated_at`

### `maintenance_records`
`id` · `asset_id` · `asset_type` · `title` · `description` · `scheduled_date` · `completed_date` · `status` · `cost` · `vendor_name` · `vendor_phone` · `parts_replaced` · `next_service_date` · `created_by` · `created_at` · `updated_at`

### `workers`
`id` · `name` · `phone` · `designation` · `wage_type` · `wage_rate` · `joining_date` · `aadhaar` · `is_active` · `created_at` · `updated_at`

### `attendance`
`id` · `worker_id` · `date` · `status` · `overtime_hours` · `advance` · `created_by` · `created_at`

**Unique constraint:** `(worker_id, date)`

### `wage_payments`
`id` · `worker_id` · `period_from` · `period_to` · `days_worked` · `gross_wages` · `deductions` · `advances_deducted` · `net_wages` · `payment_date` · `payment_mode` · `notes` · `created_by` · `created_at`

### `notifications`
`id` · `user_id` · `title` · `body` · `type` · `reference_id` · `is_read` · `sent_at`

### `weighbridges`
`id` · `name` · `type` · `com_port` · `baud_rate` · `ip_address` · `ip_port` · `max_capacity_kg` · `location_label` · `sort_order` · `api_key` · `is_active` · `created_at` · `updated_at`

### `weighbridge_live`
`weighbridge_id` (PK, FK) · `weight_kg` · `status` · `raw_string` · `vehicle_number` · `captured_at`

### `weigh_tickets`
`id` · `ticket_number` · `weighbridge_id` · `vehicle_id` · `vehicle_number` · `party_id` · `party_name` · `product_id` · `product_name` · `gross_weight_kg` · `tare_weight_kg` · `net_weight_kg` · `net_weight_mt` · `sale_id` · `operator_id` · `notes` · `created_at` · `updated_at`

**Ticket number format:** `WT/YYZZ/NNNN` (e.g. `WT/2526/0001`)

### `cameras`
`id` · `name` · `location_label` · `rtsp_url` · `hls_url` · `thumbnail_url` · `sort_order` · `is_active` · `created_at` · `updated_at`

### Views
`party_balances` — `party_id`, `party_name`, `party_type`, `total_sales`, `total_received`, `total_balance`

`item_wise_sales` — `product_id`, `product_name`, `total_qty`, `total_amount`

---

## 6. Invoice Numbering

| Type | Format | Counter column | Example |
|------|--------|---------------|---------|
| Sales invoice | `{invoice_prefix}/{FY}/{NNNN}` | `company_config.invoice_counter` | `INV/2526/0001` |
| Quarry invoice | `{quarry_invoice_prefix}/{FY}/{NNNN}` | `company_config.quarry_invoice_counter` | `QRY/2526/0001` |
| Weigh ticket | `WT/{FY}/{NNNN}` | `company_config.weighbridge_ticket_counter` | `WT/2526/0001` |

**Financial year calc:** `FY = YYZZ` where `YY` = current year's last 2 digits (April start) and `ZZ` = next year's. April–March = same FY.

---

## 7. Web Navigation (Sidebar)

All routes are in `apps/web/src/components/layout/Sidebar.tsx`.

| href | Page file | Roles |
|------|-----------|-------|
| `/dashboard` | `app/dashboard/page.tsx` | all |
| `/sales` | `app/sales/page.tsx` | admin, operations, report_viewer |
| `/purchases` | `app/purchases/page.tsx` | admin, operations |
| `/quarry` | `app/quarry/page.tsx` | admin, operations |
| `/weighbridge` | `app/weighbridge/page.tsx` | admin, operations |
| `/parties` | `app/parties/page.tsx` | admin, operations |
| `/vehicles` | `app/vehicles/page.tsx` | admin, operations |
| `/ledger` | `app/ledger/page.tsx` | admin, operations, report_viewer |
| `/reports` | `app/reports/page.tsx` | admin, operations, report_viewer |
| `/cameras` | `app/cameras/page.tsx` | admin, operations |
| `/maintenance` | `app/maintenance/page.tsx` | admin, operations |
| `/wages` | `app/wages/page.tsx` | admin, operations |
| `/users` | `app/users/page.tsx` | admin |
| `/settings` | `app/settings/page.tsx` | admin |

---

## 8. Mobile Screen Names (AppNavigator)

Screen names must match exactly between `navigation.navigate('ScreenName')` and the registered name in `AppNavigator.tsx`.

| Screen name | Component file | Tab/Stack |
|-------------|---------------|-----------|
| `Dashboard` | `DashboardScreen.tsx` | Tab |
| `SalesList` | `SalesScreen.tsx` | Sales stack |
| `NewSale` | `NewSaleScreen.tsx` | Sales stack |
| `Quarry` | `QuarryScreen.tsx` | Tab |
| `Reports` | `ReportsScreen.tsx` | Tab |
| `Vehicles` | `VehiclesScreen.tsx` | More stack |
| `Maintenance` | `MaintenanceScreen.tsx` | More stack |
| `Wages` | `WagesScreen.tsx` | More stack |
| `Notifications` | `NotificationsScreen.tsx` | More stack |
| `Weighbridge` | `WeighbridgeScreen.tsx` | More stack |

---

## 9. Environment Variables

### Backend (`.env`)

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | No | Default 3001 |
| `NODE_ENV` | No | `development` / `production` |
| `JWT_SECRET` | **Yes** | Min 32 chars |
| `DB_HOST` | **Yes** | PostgreSQL host |
| `DB_PORT` | No | Default 5432 |
| `DB_NAME` | **Yes** | Database name |
| `DB_USER` | **Yes** | |
| `DB_PASSWORD` | **Yes** | |
| `DB_SSL` | No | `true` in prod |
| `AZURE_STORAGE_CONNECTION_STRING` | No | Required for invoice upload |
| `AZURE_STORAGE_CONTAINER` | No | Default `stone-crusher-docs` |
| `AZURE_NOTIFICATION_HUB_CONNECTION_STRING` | No | Required for push notifications |
| `AZURE_NOTIFICATION_HUB_NAME` | No | Required for push notifications |
| `MEDIAMTX_API_URL` | No | Required for camera registration |
| `MEDIAMTX_HLS_URL` | No | Required for HLS URL generation |
| `CORS_ORIGINS` | No | Comma-separated |

### Web (`apps/web/.env.local`)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Full URL incl. `/api` e.g. `https://api.bluemetal.app/api` |
| `NEXT_PUBLIC_WEIGHBRIDGE_WS_URL` | No | Default `ws://localhost:8765` |

### Mobile (`apps/mobile/.env`)

| Variable | Required | Notes |
|----------|----------|-------|
| `EXPO_PUBLIC_API_URL` | **Yes** | Full URL incl. `/api` |

### Edge Agent (`packages/weighbridge-agent/.env`)

| Variable | Required | Notes |
|----------|----------|-------|
| `WEIGHBRIDGE_ID` | **Yes** | UUID from `weighbridges.id` |
| `WEIGHBRIDGE_API_KEY` | **Yes** | Value from `weighbridges.api_key` |
| `API_URL` | **Yes** | Backend base URL (no `/api` suffix) |
| `COM_PORT` | **Yes** | e.g. `COM3`, `/dev/ttyUSB0` |
| `BAUD_RATE` | No | Default 9600 |
| `WS_PORT` | No | Default 8765 |
| `HTTP_PORT` | No | Default 8766 |

---

## 10. Frontend API Helper Functions (`apps/web/src/lib/api.ts`)

All helpers are named after the HTTP action + resource. If a helper is missing, add it here before using raw `api.get/post` in a component.

| Function | Method + Path |
|----------|--------------|
| `login(email, password)` | POST `/auth/login` |
| `getSales(params?)` | GET `/sales` |
| `createSale(data)` | POST `/sales` |
| `getSale(id)` | GET `/sales/:id` |
| `cancelSale(id)` | PATCH `/sales/:id/cancel` |
| `getTodaySummary()` | GET `/sales/summary/today` |
| `getPurchases(params?)` | GET `/purchases` |
| `getPurchase(id)` | GET `/purchases/:id` |
| `createPurchase(data)` | POST `/purchases` |
| `updatePurchase(id, data)` | PUT `/purchases/:id` |
| `getParties(params?)` | GET `/parties` |
| `createParty(data)` | POST `/parties` |
| `getProducts()` | GET `/products` |
| `getVehicles()` | GET `/vehicles` |
| `createVehicle(data)` | POST `/vehicles` |
| `getItemWiseReport(params)` | GET `/reports/item-wise` |
| `getPartyWiseReport(params)` | GET `/reports/party-wise` |
| `getGstSummary(params)` | GET `/reports/gst-summary` |
| `getMonthlyTrend()` | GET `/reports/monthly-trend` |
| `getDashboard()` | GET `/reports/dashboard` |
| `downloadInvoice(saleId)` | GET `/invoices/:id/pdf` |
| `getPurchases(params?)` | GET `/purchases` |
| `getLedgerBalances()` | GET `/ledger/balances` |
| `getPartyLedger(partyId, params?)` | GET `/ledger/party/:id` |
| `createReceipt(data)` | POST `/ledger/receipt` |
| `getQuarrySales(params?)` | GET `/quarry` |
| `createQuarrySale(data)` | POST `/quarry` |
| `getUsers()` | GET `/users` |
| `createUser(data)` | POST `/users` |
| `updateUser(id, data)` | PUT `/users/:id` |
| `getMaintenanceRecords(params?)` | GET `/maintenance/records` |
| `getUpcomingMaintenance()` | GET `/maintenance/upcoming` |
| `getAssets(params?)` | GET `/maintenance/assets` |
| `getWorkers()` | GET `/wages/workers` |
| `getAttendance(params)` | GET `/wages/attendance` |
| `submitAttendance(data)` | POST `/wages/attendance/bulk` |
| `getConfig()` | GET `/config` |
| `updateConfig(data)` | PUT `/config` |
| `getNotifications()` | GET `/notifications` |
