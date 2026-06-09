# Stone Crusher ERP

Full-stack ERP for stone crusher industry — mobile app (iOS + Android) + web dashboard, hosted on Azure.

## Architecture

```
Azure App Service (Node.js API)
Azure PostgreSQL Flexible Server
Azure Blob Storage (invoices / docs)
Azure Notification Hubs (push notifications)
Azure Static Web Apps (Next.js web)
React Native Expo (mobile)
```

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
| Item-wise Reports | ✅ | ✅ |
| GST Summary | — | ✅ |
| Maintenance (Machinery + Vehicle) | ✅ | — |
| Wages & Attendance | ✅ | — |
| Push Notifications | ✅ | — |
| User Management | — | ✅ |
| Company Config / GST Setup | — | ✅ |

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access |
| `sales_operator` | Create sales, add vehicles, manage parties |
| `accounts` | Sales, purchases, ledger, wages |
| `report_viewer` | Read-only reports |
| `vehicle_manager` | Vehicles + maintenance |
| `quarry_operator` | Quarry sales only |

## Setup

### 1. Deploy Azure Infrastructure

```bash
# Edit infra/params.json with your values
az group create --name stone-crusher-rg --location southeastasia
az deployment group create \
  --resource-group stone-crusher-rg \
  --template-file infra/main.bicep \
  --parameters @infra/params.json
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in values from Azure portal outputs
npm install
npm run migrate   # Run DB migrations
npm run build
# Deploy to Azure App Service via zip deploy or GitHub Actions
```

### 3. Web Dashboard

```bash
cd apps/web
echo "NEXT_PUBLIC_API_URL=https://your-api.azurewebsites.net/api" > .env.local
npm install
npm run build
# Deploy to Azure Static Web Apps via GitHub Actions
```

### 4. Mobile App

```bash
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=https://your-api.azurewebsites.net/api" > .env
npm install
npx expo start
# Build for production:
npx eas build --platform all
```

### 5. Create First Admin User

```sql
-- Run against your PostgreSQL database
INSERT INTO company_config (company_name, gstin, address, phone, invoice_prefix)
VALUES ('Your Company Name', 'YOUR_GSTIN', 'Address', 'Phone', 'INV');

INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin', 'admin@company.com', crypt('YourPassword123', gen_salt('bf')), 'admin');
```

## Products Pre-loaded

- M-Sand, P-Sand, 20mm Chilli, 40mm, 12mm, 6mm Aggregates
- Stone Dust, GSB, WMM, Boulder/Bollar
- All with HSN code 25171010 and 5% GST

## Invoice Format

Financial year-based auto-numbering: `INV/2526/0001`

Supports:
- Tax Invoice (CGST + SGST intra-state, IGST inter-state)
- Delivery Challan
- Bill of Supply

PDF generated server-side, stored in Azure Blob Storage.
