# Versioning Policy — BlueMetal Pro

## Scheme

BlueMetal Pro uses **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).

| Segment | Increment when… |
|---|---|
| **MAJOR** | Breaking API changes, database schema incompatible migrations, major UX overhauls |
| **MINOR** | New features, new modules, new integrations (backwards-compatible) |
| **PATCH** | Bug fixes, security patches, performance improvements, documentation updates |

## Branch strategy

```
main         ← production-ready, tagged releases only
develop      ← integration branch, all feature branches merge here first
feature/*    ← one branch per feature (e.g. feature/weighbridge-integration)
fix/*        ← bug fixes
hotfix/*     ← emergency production patches (branch from main, merge to both main & develop)
release/*    ← release stabilisation (feature freeze, only fixes allowed)
```

## Release process

1. **Cut a release branch** from `develop`: `git checkout -b release/1.2.0`
2. **Bump versions** in all `package.json` files and `CHANGELOG.md`
3. **Open a PR** from `release/1.2.0` → `main`
4. **After merge**, tag the commit: `git tag -a v1.2.0 -m "BlueMetal Pro v1.2.0"`
5. **Push the tag**: `git push origin v1.2.0` — this triggers the release workflow
6. **Back-merge** `main` → `develop`

## Hotfix process

1. Branch from `main`: `git checkout -b hotfix/1.1.1`
2. Fix, test, bump `PATCH` in `package.json` and `CHANGELOG.md`
3. PR into both `main` and `develop`
4. Tag `v1.1.1` after merge to `main`

## Package versioning

All packages in the monorepo share the same version (lock-step versioning):

```
/package.json               → root meta version
/backend/package.json       → same version
/apps/web/package.json      → same version
/apps/mobile/package.json   → same version (also matches app.json version)
/packages/shared/package.json
/packages/weighbridge-agent/package.json
```

Use the helper script to bump all at once:
```bash
npm run version:bump -- 1.2.0
```

## Database migrations

- Each migration file is numbered sequentially: `001_initial.sql`, `002_weighbridge.sql`, etc.
- Migrations are **append-only** — never edit an existing migration file after it has been run in production.
- Every migration must be **idempotent** (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.).
- The CI pipeline runs migrations before the backend deploy (see `backend.yml`).
- To roll back, write a new `NNN_rollback_<description>.sql` migration — never run `DROP` manually.

## API versioning

The REST API currently uses an implicit `v1` (no prefix). When breaking changes are required:

- Add a new versioned prefix: `/api/v2/sales`
- Keep `/api/v1/sales` alive for at least **one MINOR release** with a deprecation header
- Document the migration path in `docs/api-migration.md`
