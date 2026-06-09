# Contributing to BlueMetal Pro

## The Golden Rule

**Nothing goes to `main` directly. Every change goes through a Pull Request.**

`main` is protected — direct pushes are blocked. All PRs must pass `all-checks-pass` before merge.

---

## Deployment Flow

```
feature branch  →  Pull Request  →  all-checks-pass  →  merge to main  →  auto-deploy
```

| Step | What happens | Who/what does it |
|------|-------------|-----------------|
| 1. Branch | `git checkout -b feat/my-feature` | Developer |
| 2. Develop | Write code, run `bash scripts/check.sh` locally | Developer |
| 3. PR | Open PR with conventional commit title | Developer |
| 4. CI gates | 8 check jobs run automatically (see below) | `pr-checks.yml` |
| 5. Merge | Squash & merge once all checks pass | Developer |
| 6. Deploy | Web → Azure SWA, Backend → Container Apps, Mobile → EAS | `web.yml`, `backend.yml`, `mobile.yml` |
| 7. Release | Version bump, CHANGELOG, architecture doc, git tag | `release.yml` |
| 8. Sync | Required file list auto-updated in `check.sh` | `pr-checks.yml` (sync-docs job) |

---

## CI Gates (must all pass before merge)

| Job | What it checks |
|-----|---------------|
| `typecheck` | TypeScript — all 5 packages (shared, backend, web, mobile, weighbridge-agent) |
| `commit-lint` | All commits + PR title follow [Conventional Commits](https://www.conventionalcommits.org/) |
| `sql-check` | Migration syntax — balanced `$$`, no unclosed `CREATE TABLE` |
| `files-check` | All required files exist; `sync_checks.py` list is up to date |
| `json-check` | All `package.json`, `app.json` are valid JSON |
| `secrets-scan` | No hardcoded secrets, Azure connection strings, or `.env` files |
| `bicep-check` | Bicep infrastructure template compiles |
| `contract-tests` | 90 cross-layer checks — API routes, sidebar nav, mobile screens, DB schema, auth middleware |

---

## Commit Message Format

```
<type>(<scope>): <description>

Types: feat | fix | docs | refactor | perf | test | ci | chore | revert
Scope: optional — e.g. (mobile), (web), (backend), (db)

Examples:
  feat(sales): add bulk invoice PDF export
  fix(mobile): correct attendance toggle state on re-render
  docs: update hardware setup guide for RS-232 wiring
  chore(deps): bump expo to 52
```

Breaking changes: append `!` after type → triggers major version bump.

---

## Adding a New Feature

### 1. New backend route

```
backend/src/routes/my-route.ts     ← create route file
backend/src/index.ts               ← mount it: app.use('/api/my-route', ...)
apps/web/src/lib/api.ts            ← add helper functions
```

The contract tests (`scripts/contract_test.py`) **automatically detect** new route files and verify:
- Every `api.ts` helper maps to a real backend route
- Auth middleware is applied
- DB columns used in INSERT/UPDATE exist in migrations

No manual test updates needed for new routes.

### 2. New web page

```
apps/web/src/app/my-page/page.tsx  ← create page
apps/web/src/components/layout/Sidebar.tsx  ← add nav entry
```

`sync_checks.py` auto-adds the new `page.tsx` to the required files list on next push to `main`.
Contract tests verify the sidebar href resolves to the page file.

### 3. New mobile screen

```
apps/mobile/src/screens/MyScreen.tsx    ← create screen
apps/mobile/src/navigation/AppNavigator.tsx  ← register it
```

Contract tests scan `AppNavigator.tsx` and verify every registered screen component exists.
`sync_checks.py` auto-adds `*Screen.tsx` files to the required list.

### 4. New database migration

```
database/migrations/004_my_feature.sql  ← create migration (append-only, idempotent)
```

Always use `IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`.
SQL check validates syntax automatically. Contract tests verify column names used in backend routes exist in migrations.

### 5. New environment variable

```
backend/.env.example   ← document it here (required by CI)
backend/src/...        ← use process.env.MY_VAR
```

Contract tests fail if a `process.env.VAR` in backend code is not documented in `.env.example`.

---

## Running Checks Locally

```bash
# Full suite (TypeScript + SQL + JSON + secrets + contract tests)
bash scripts/check.sh

# Just contract tests (fast, no install needed)
python3 scripts/contract_test.py

# Verify required file list is up to date
python3 scripts/sync_checks.py --verify

# Update required file list (run after adding/removing files)
python3 scripts/sync_checks.py
```

Install the pre-push hook to run contract tests automatically before every push:

```bash
cp scripts/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

---

## Deployment Environments

| Environment | Trigger | URL |
|-------------|---------|-----|
| Web (production) | Merge to `main` | Azure Static Web Apps |
| Backend (production) | Merge to `main` | `https://bluemetal-prod-api.redflower-fa4e0eb0.eastus2.azurecontainerapps.io` |
| Mobile (preview APK) | Merge to `main` or manual dispatch | [expo.dev/accounts/haneesh17/projects/bluemetal-pro](https://expo.dev/accounts/haneesh17/projects/bluemetal-pro) |

PR preview deployments are created automatically for every open PR (web only, via Azure Static Web Apps).

---

## What the Release Pipeline Does Automatically

On every merge to `main` the `release.yml` workflow:
1. Reads all commits since the last git tag
2. Determines version bump: `feat` → minor, `fix`/`perf` → patch, `BREAKING CHANGE` → major
3. Updates `VERSION` file and all 6 `package.json` files
4. Prepends a new section to `CHANGELOG.md`
5. Updates the `<!-- version: x.y.z -->` tag in `docs/architecture.md`
6. Commits with `[skip ci]` and creates a git tag

You never need to manually update version numbers or the changelog.
