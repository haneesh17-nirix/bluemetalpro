#!/usr/bin/env bash
# BlueMetal Pro — full static-analysis check suite
# Run locally:  bash scripts/check.sh
# Run in CI:    same command, matrix jobs call individual sections via CHECK= env var
#
# Exit codes: 0 = all passed, non-zero = at least one check failed.

set -euo pipefail

PASS=0
FAIL=0
ERRORS=()

# ── helpers ────────────────────────────────────────────────────────────────────

green()  { printf '\033[0;32m  ✓  %s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m  ✗  %s\033[0m\n' "$*"; }
header() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }

run() {
  local label="$1"; shift
  if "$@" > /tmp/bluemetal_check_out.txt 2>&1; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label"
    cat /tmp/bluemetal_check_out.txt
    ERRORS+=("$label")
    FAIL=$((FAIL + 1))
    # In CI (non-interactive) we keep going to collect all failures
    if [[ "${CI:-}" != "true" ]]; then
      echo ""
      echo "  ^ failed. Re-run with CHECK=1 to stop at first error."
    fi
  fi
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── 1. TypeScript ──────────────────────────────────────────────────────────────

header "TypeScript type-checking"

# Run tsc using the locally installed binary inside each package.
# If node_modules is missing, install devDeps first (--ignore-scripts is faster/safer).
typecheck() {
  local dir="$1"
  local tsconfig="$2"
  if [[ ! -f "$dir/node_modules/.bin/tsc" ]]; then
    echo "  Installing deps in $dir…"
    npm install --prefix "$dir" --ignore-scripts --silent 2>&1 || true
  fi
  "$dir/node_modules/.bin/tsc" --noEmit -p "$tsconfig"
}

run "shared types"       typecheck packages/shared           packages/shared/tsconfig.json
run "backend"            typecheck backend                   backend/tsconfig.json
run "web dashboard"      typecheck apps/web                  apps/web/tsconfig.json
run "mobile"             typecheck apps/mobile               apps/mobile/tsconfig.json
run "weighbridge-agent"  typecheck packages/weighbridge-agent packages/weighbridge-agent/tsconfig.json

# ── 2. SQL migrations ──────────────────────────────────────────────────────────

header "SQL migration syntax"

check_sql() {
  local file="$1"
  # pg_format is optional; fall back to a basic syntax grep check
  if command -v pg_format &>/dev/null; then
    pg_format --check "$file"
  else
    # Ensure no runaway unclosed strings or dollar-quoting issues via grep heuristics
    # Check 1: balanced single quotes per line (rough)
    python3 - "$file" <<'PYEOF'
import sys, re

path = sys.argv[1]
with open(path) as f:
    content = f.read()

# Must contain at least one CREATE TABLE or ALTER TABLE
if not re.search(r'\b(CREATE|ALTER|INSERT|UPDATE|DROP)\b', content, re.I):
    print(f"WARNING: {path} appears empty of SQL statements")

# Check for unmatched $$ dollar-quoting
dollars = content.count('$$')
if dollars % 2 != 0:
    print(f"ERROR: {path} has unmatched $$ dollar-quoting ({dollars} occurrences)")
    sys.exit(1)

print(f"OK: {path}")
PYEOF
  fi
}

for sql in database/migrations/*.sql; do
  run "sql: $(basename "$sql")" check_sql "$sql"
done

# ── 3. Bicep ───────────────────────────────────────────────────────────────────

header "Bicep / ARM template"

if command -v az &>/dev/null; then
  run "bicep build (syntax)" az bicep build --file infra/main.bicep --outfile /tmp/bluemetal_arm.json
else
  echo "  ⚠  Azure CLI not found — skipping Bicep build (install 'az' to enable)"
fi

# ── 4. JSON / config files ─────────────────────────────────────────────────────

header "JSON validity"

check_json() {
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$1"
}

JSON_FILES=(
  package.json
  apps/mobile/app.json
  apps/mobile/package.json
  apps/web/package.json
  backend/package.json
  packages/shared/package.json
  packages/weighbridge-agent/package.json
)

for f in "${JSON_FILES[@]}"; do
  [[ -f "$f" ]] && run "json: $f" check_json "$f"
done

# ── 5. Required files exist ────────────────────────────────────────────────────

header "Required files present"

REQUIRED=(
  # Root
  CHANGELOG.md
  VERSIONING.md
  README.md
  .editorconfig
  .gitignore
  VERSION
  docs/architecture.md
  docs/hardware-setup.md
  # Database
  database/migrations/001_initial.sql
  database/migrations/002_weighbridge_cameras.sql
  database/migrations/003_test_accounts.sql
  database/migrations/004_crushers.sql
  database/migrations/005_seed_crusher_access.sql
  database/migrations/006_notifications_v2.sql
  database/migrations/007_seed_test_data.sql
  database/migrations/008_platform_admin.sql
  database/migrations/009_more_test_data.sql
  # Backend
  backend/src/index.ts
  backend/.env.example
  backend/src/routes/auth.ts
  backend/src/routes/cameras.ts
  backend/src/routes/config.ts
  backend/src/routes/crushers.ts
  backend/src/routes/invoices.ts
  backend/src/routes/ledger.ts
  backend/src/routes/maintenance.ts
  backend/src/routes/notifications.ts
  backend/src/routes/parties.ts
  backend/src/routes/platform.ts
  backend/src/routes/products.ts
  backend/src/routes/purchases.ts
  backend/src/routes/quarry.ts
  backend/src/routes/reports.ts
  backend/src/routes/sales.ts
  backend/src/routes/users.ts
  backend/src/routes/vehicles.ts
  backend/src/routes/wages.ts
  backend/src/routes/weighbridge.ts
  backend/src/services/pdfGenerator.ts
  backend/src/services/notifications.ts
  # Shared package
  packages/shared/src/index.ts
  packages/shared/src/types/camera.ts
  packages/shared/src/types/weighbridge.ts
  packages/shared/src/utils/clientLogger.ts
  packages/shared/src/utils/parsers.ts
  # Weighbridge agent
  packages/weighbridge-agent/src/index.ts
  packages/weighbridge-agent/.env.example
  # Web pages
  apps/web/src/app/cameras/page.tsx
  apps/web/src/app/crushers/page.tsx
  apps/web/src/app/dashboard/page.tsx
  apps/web/src/app/ledger/page.tsx
  apps/web/src/app/login/page.tsx
  apps/web/src/app/maintenance/page.tsx
  apps/web/src/app/page.tsx
  apps/web/src/app/parties/page.tsx
  apps/web/src/app/platform/page.tsx
  apps/web/src/app/purchases/page.tsx
  apps/web/src/app/quarry/page.tsx
  apps/web/src/app/reports/page.tsx
  apps/web/src/app/sales/page.tsx
  apps/web/src/app/select-crusher/page.tsx
  apps/web/src/app/settings/page.tsx
  apps/web/src/app/users/page.tsx
  apps/web/src/app/vehicles/page.tsx
  apps/web/src/app/wages/page.tsx
  apps/web/src/app/weighbridge/page.tsx
  # Mobile
  apps/mobile/App.tsx
  apps/mobile/index.js
  apps/mobile/app.json
  apps/mobile/eas.json
  apps/mobile/src/screens/CrusherSelectScreen.tsx
  apps/mobile/src/screens/DashboardScreen.tsx
  apps/mobile/src/screens/LoginScreen.tsx
  apps/mobile/src/screens/MaintenanceScreen.tsx
  apps/mobile/src/screens/NewSaleScreen.tsx
  apps/mobile/src/screens/NotificationsScreen.tsx
  apps/mobile/src/screens/QuarryScreen.tsx
  apps/mobile/src/screens/ReportsScreen.tsx
  apps/mobile/src/screens/SalesListScreen.tsx
  apps/mobile/src/screens/VehiclesScreen.tsx
  apps/mobile/src/screens/WagesScreen.tsx
  apps/mobile/src/screens/WeighbridgeScreen.tsx
  # Infra
  infra/main.bicep
  # CI workflows
  .github/workflows/backend.yml
  .github/workflows/infra.yml
  .github/workflows/mobile.yml
  .github/workflows/pr-checks.yml
  .github/workflows/release.yml
  .github/workflows/web.yml
)

for f in "${REQUIRED[@]}"; do
  run "exists: $f" test -f "$f"
done

# ── 6. Sensitive strings not committed ────────────────────────────────────────

header "Secrets scan"

check_no_secrets() {
  local pattern="$1"
  local label="$2"
  if grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
       --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
       -E "$pattern" . > /tmp/secrets_scan.txt 2>&1; then
    echo "Found potential secret ($label):"
    cat /tmp/secrets_scan.txt
    return 1
  fi
  return 0
}

run "no hardcoded JWT secrets"     check_no_secrets "jwt_secret\s*[:=]\s*['\"][a-zA-Z0-9]{16,}" "JWT secret"
run "no hardcoded DB passwords"    check_no_secrets "password\s*[:=]\s*['\"][^'\"]{8,}['\"]" "DB password"
run "no Azure connection strings"  check_no_secrets "DefaultEndpointsProtocol=https;AccountName" "Azure conn string"

# ── 7. Cross-layer contract tests (frontend ↔ backend ↔ DB) ───────────────────

header "Cross-layer contract tests"

if command -v python3 &> /dev/null; then
  run "contract_test.py" python3 scripts/contract_test.py
else
  red "python3 not found — skipping contract tests"
  FAIL=$((FAIL + 1))
  ERRORS+=("python3 not installed")
fi

# ── Summary ────────────────────────────────────────────────────────────────────

echo ""
echo "──────────────────────────────────────────────────────"
printf "  Passed: \033[0;32m%d\033[0m   Failed: \033[0;31m%d\033[0m\n" "$PASS" "$FAIL"
echo "──────────────────────────────────────────────────────"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failed checks:"
  for e in "${ERRORS[@]}"; do
    red "$e"
  done
  echo ""
  exit 1
fi

echo ""
green "All checks passed."
echo ""
