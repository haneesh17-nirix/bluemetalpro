# GitHub Actions — Required Secrets

Set these in **Settings → Secrets and variables → Actions → New repository secret**.

## Azure Credentials (all workflows)

| Secret | Value | How to get |
|---|---|---|
| `AZURE_CREDENTIALS` | JSON service principal | See below |
| `AZURE_RESOURCE_GROUP` | `stone-crusher-rg` | Your resource group name |

### Create the service principal

```bash
az ad sp create-for-rbac \
  --name "stone-crusher-github-actions" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/stone-crusher-rg \
  --sdk-auth
```

Copy the full JSON output as the value of `AZURE_CREDENTIALS`.

---

## Backend secrets

| Secret | Value |
|---|---|
| `DB_HOST` | e.g. `stonecrusher-prod-postgres.postgres.database.azure.com` |
| `DB_USER` | e.g. `scadmin@stonecrusher-prod-postgres` |
| `DB_PASSWORD` | Your PostgreSQL admin password |
| `JWT_SECRET` | Random string ≥ 32 chars — `openssl rand -hex 32` |

---

## Web secrets

| Secret | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | From Azure portal → Static Web App → Manage deployment token |
| `NEXT_PUBLIC_API_URL` | `https://stonecrusher-prod-api.azurewebsites.net/api` |
| `NEXT_PUBLIC_API_URL_STAGING` | Staging API URL (for PR previews) |

---

## Mobile secrets

| Secret | Value |
|---|---|
| `EXPO_TOKEN` | From expo.dev → Account → Access Tokens |
| `EXPO_PUBLIC_API_URL` | `https://stonecrusher-prod-api.azurewebsites.net/api` |

---

## One-time setup checklist

- [ ] Create Azure resource group: `az group create -n stone-crusher-rg -l southeastasia`
- [ ] Deploy infra: `az deployment group create --resource-group stone-crusher-rg --template-file infra/main.bicep --parameters @infra/params.json`
- [ ] Run DB migrations manually once: `psql -h <host> -U <user> -d stonecrusherdb -f database/migrations/001_initial.sql`
- [ ] Create first admin user (SQL in README)
- [ ] Add all secrets above to GitHub
- [ ] Create EAS project: `cd apps/mobile && npx eas init`
- [ ] Add Firebase project → download `google-services.json` → add to `apps/mobile/`
- [ ] Register FCM server key in Azure Notification Hub (portal → Notification Hub → Google (GCM/FCM))
- [ ] (iOS only) Add Apple Push Notification cert to Notification Hub

## Environments

Create two **Environments** in GitHub (`Settings → Environments`):

| Environment | Protection |
|---|---|
| `production` | Require review before deploy |
| `preview` | No protection needed |
