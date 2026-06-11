# Incident Report — Login Broken (2026-06-11)

## Summary

Login was completely broken after the tenant architecture was introduced in v1.22.0.
All users received a "Server error" after submitting credentials.

---

## Timeline

| Time | Event |
|---|---|
| 2026-06-10 | v1.22.0 deployed — tenant layer, 3-step auth flow, migration 014 |
| 2026-06-11 | Login reported as broken |
| 2026-06-11 | Root causes identified and fixed — v1.22.4 deployed |

---

## Root Causes (two separate bugs)

### Bug 1 — Migration 014 missing from CI pipeline

**File:** `.github/workflows/backend.yml`

`014_add_tenants.sql` was written and committed but never added to the migration run list in the backend CI workflow. The `tenants` table therefore did not exist on the production database.

Every login attempt hit the `/auth/login` endpoint, which queries `SELECT ... FROM tenants ...`. PostgreSQL threw a "relation does not exist" error, the catch block returned `500 { error: 'Server error' }`, and the frontend displayed the error toast.

**Fix:** Added `psql "$CONN" -f database/migrations/014_add_tenants.sql` to `backend.yml`. Deployed as part of v1.22.2.

---

### Bug 2 — PostgreSQL type mismatch in COALESCE (primary login-breaking bug)

**File:** `backend/src/routes/auth.ts` — `/auth/select-tenant` and `/auth/select-crusher`

After Bug 1 was fixed and migration 014 ran, login step 1 (`/auth/login`) returned tenants successfully. But step 2 (`/auth/select-tenant`) still returned `500 { error: 'Server error' }`.

**Root cause:** Both the `select-tenant` and `select-crusher` queries used:

```sql
COALESCE(uca.role, uta.role) AS role
```

- `user_crusher_access.role` is a PostgreSQL custom enum type: `user_role`
- `user_tenant_access.role` is `VARCHAR(50)`

PostgreSQL's `COALESCE` requires its arguments to resolve to a common type. There is no implicit cast from `user_role` enum to `character varying`, so PostgreSQL rejected the query with a type error. The catch block swallowed the error and returned 500.

**Fix:** Explicit cast on the enum column:

```sql
COALESCE(uca.role::text, uta.role) AS role
```

Applied in both affected queries. Deployed as v1.22.4.

---

## Verification

Full 3-step auth flow tested via `curl` against production API after deploy:

| Step | Endpoint | Result |
|---|---|---|
| 1 | `POST /auth/login` | ✓ Returns `temp_token` + `tenants[]` |
| 2 | `POST /auth/select-tenant` | ✓ Returns tenant-scoped token + `crushers[]` |
| 3 | `POST /auth/select-crusher` | ✓ Returns full 7-day JWT with `tenant_id`, `crusher_id`, `role` |

Test account used: `admin@bluemetal.local` / `Test@1234`

---

## What to watch for in future

1. **Always add new migration files to `backend.yml`** immediately after writing them. The CI pipeline does not auto-discover migration files — each must be listed explicitly.

2. **When joining tables with a PostgreSQL enum column to a VARCHAR column**, always cast the enum to `::text` in any expression that needs type compatibility (`COALESCE`, `||`, comparison, etc.).

3. **The 3-step auth flow** has two internal 15-minute temp tokens. Any server error during step 2 or 3 manifests as a login failure even when step 1 succeeds. Future debugging: test each step independently with `curl` to isolate which step fails.
