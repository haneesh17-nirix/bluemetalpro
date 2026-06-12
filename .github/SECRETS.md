# GitHub Actions — Required Secrets

Set these in **Settings → Secrets and variables → Actions → New repository secret**.

## Azure Credentials (all workflows)

| Secret | Value | How to get |
|---|---|---|
| `AZURE_CREDENTIALS` | JSON service principal | See below |
| `AZURE_RESOURCE_GROUP` | `bluemetal-prod-rg` | Your resource group name |

### Create the service principal

```bash
az ad sp create-for-rbac \
  --name "bluemetal-github-actions" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/bluemetal-prod-rg \
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
| `NEXT_PUBLIC_API_URL` | `https://api.bluemetalpro.in/api` |
| `NEXT_PUBLIC_API_URL_STAGING` | Staging API URL (for PR previews) |

---

## Mobile secrets

| Secret | Value |
|---|---|
| `EXPO_TOKEN` | From expo.dev → Account → Access Tokens |
| `EXPO_PUBLIC_API_URL` | `https://api.bluemetalpro.in/api` — **also add this in Expo dashboard** (expo.dev → Project → Environment variables) so EAS builds can access it |

---

## Release workflow — GH_PAT (optional but recommended)

The release workflow pushes a version-bump commit back to `main` after every merge. With the default `GITHUB_TOKEN` this works but **will not trigger downstream workflows** (GitHub prevents token-triggered runs from re-triggering workflows to avoid loops).

If you need the post-release commit to kick off the `backend.yml` / `web.yml` / `mobile.yml` deploys, create a Personal Access Token and add it as `GH_PAT`:

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Create a token scoped to this repository with **Contents: Read and Write** and **Workflows: Read and Write**
3. Add it as repository secret `GH_PAT` (**Settings → Secrets and variables → Actions**)

Without `GH_PAT`, the release workflow falls back to `GITHUB_TOKEN` — the version-bump commit is still pushed and tagged, but the deploy workflows will not auto-run from that commit. You can trigger them manually via `workflow_dispatch` if needed.

---

## One-time setup checklist

- [ ] Create Azure resource group: `az group create -n bluemetal-prod-rg -l eastus2`
- [ ] Deploy infra: `az deployment group create --resource-group bluemetal-prod-rg --template-file infra/main.bicep --parameters @infra/params.json`
- [ ] Run DB migrations manually once: `for f in $(ls database/migrations/*.sql | sort); do psql -h <host> -U <user> -d stonecrusherdb -f "$f"; done`
- [ ] Create first platform_admin user (SQL in README)
- [ ] Add all secrets above to GitHub
- [ ] (Optional) Add `GH_PAT` secret for cross-workflow triggering (see Release workflow section above)
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
