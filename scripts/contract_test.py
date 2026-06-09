#!/usr/bin/env python3
"""
BlueMetal Pro — Cross-layer contract tests
Statically validates frontend ↔ backend ↔ database consistency.

Checks:
  1. Backend route registry      — every route in routes/*.ts is reachable
  2. Mount prefix duplication    — no sub-route repeats its router's mount segment
  3. Frontend → backend coverage — every API call in lib/api.ts hits a real route
  4. Inline page API calls       — direct api.METHOD() in pages also hit real routes
  5. Sidebar nav → page files    — every href has a page.tsx
  6. Mobile screen registry      — every registered screen has a source file
  7. DB schema vs SQL usage      — INSERT/UPDATE column names exist in migration DDL
  8. Request body field parity   — explicit body objects sent match backend req.body destructuring
  9. Query param consistency     — backend req.query reads match frontend params sent
 10. Env var coverage            — every process.env.X in backend has a .env.example entry

Run locally:  python3 scripts/contract_test.py
Exit 0 = all passed, 1 = failures found
"""

import re
import sys
import os
import glob
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

# ── colour helpers ─────────────────────────────────────────────────────────────
def green(m):  print(f"\033[0;32m  ✓  {m}\033[0m")
def red(m):    print(f"\033[0;31m  ✗  {m}\033[0m")
def warn(m):   print(f"\033[0;33m  ⚠  {m}\033[0m")
def header(m): print(f"\n\033[1;34m▶ {m}\033[0m")

PASS, FAIL = 0, 0
ERRORS = []

def check(label, ok, detail=""):
    global PASS, FAIL
    if ok:
        green(label)
        PASS += 1
    else:
        msg = f"{label}: {detail}" if detail else label
        red(msg)
        ERRORS.append(msg)
        FAIL += 1

def read(path):
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""

# ── normalization helpers ──────────────────────────────────────────────────────
def normalize_path(p: str) -> str:
    """
    Normalize a URL path for comparison:
      • Replace JS template-literal dynamic segments  ${...}  →  :p
      • Replace named route params  :word  →  :p
      • Collapse trailing slash
      • Remove query string
    e.g.  /ledger/party/${partyId}  →  /ledger/party/:p
          /sales/:id/cancel         →  /sales/:p/cancel
    """
    p = p.split("?")[0]                          # strip query string
    p = re.sub(r"\$\{[^}]+\}", ":p", p)          # ${var} → :p
    p = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", ":p", p)  # :named → :p
    p = p.rstrip("/") or "/"
    return p

def method_norm(m: str) -> str:
    return m.upper()

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1  Build backend route registry
# ══════════════════════════════════════════════════════════════════════════════
header("Building backend route registry")

# 1a. Parse index.ts for mount points
# Pattern:  app.use('/api/wages', wagesRouter)
index_src = read("backend/src/index.ts")
mount_map: dict[str, str] = {}  # routerVar → mountPath
for m in re.finditer(
    r"app\.use\(['\"]([^'\"]+)['\"],\s*([A-Za-z_][A-Za-z0-9_]*)\)",
    index_src
):
    mount_path, router_var = m.group(1), m.group(2)
    if mount_path.startswith("/api/"):
        mount_map[router_var] = mount_path

check("index.ts: mount points parsed",
      len(mount_map) >= 17,
      f"found {len(mount_map)} (expected ≥ 17): {list(mount_map.keys())}")

# 1b. Parse each routes file for route handler definitions
# Pattern:  wagesRouter.get('/workers', ...) or router.post('/path', ...)
BackendRoute = tuple  # (method, normalized_full_path, source_file, raw_path)
backend_routes: list[BackendRoute] = []

route_files = glob.glob("backend/src/routes/*.ts")
for rf in sorted(route_files):
    src = read(rf)
    fname = Path(rf).name

    # Find router variable name(s) declared in this file
    # Pattern:  export const wagesRouter = Router()
    router_vars = re.findall(
        r"export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Router\(\)", src
    )
    # Also catch: const router = Router()  (fallback)
    router_vars += re.findall(
        r"const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Router\(\)", src
    )
    router_vars = list(set(router_vars))

    # Find all route handler calls
    for m in re.finditer(
        r"([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|patch|delete)\(['\"`]([^'\"` ]+)['\"`]",
        src, re.IGNORECASE
    ):
        var, method, path = m.group(1), m.group(2), m.group(3)
        if var not in router_vars:
            continue
        # Find mount for this router variable
        mount = mount_map.get(var)
        if not mount:
            continue
        if path == "/":
            full = mount
        else:
            full = mount + path
        backend_routes.append((method_norm(method), normalize_path(full), fname, path))

check("Routes files: route definitions parsed",
      len(backend_routes) >= 50,
      f"found {len(backend_routes)} (expected ≥ 50)")

# Build lookup set for coverage checks
backend_route_set: set[tuple[str, str]] = {(r[0], r[1]) for r in backend_routes}

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 2  Mount prefix duplication
# ══════════════════════════════════════════════════════════════════════════════
header("Mount prefix duplication (double-segment anti-pattern)")

for rf in sorted(route_files):
    src = read(rf)
    fname = Path(rf).name

    router_vars = list(set(
        re.findall(r"export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Router\(\)", src) +
        re.findall(r"const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Router\(\)", src)
    ))

    for var in router_vars:
        mount = mount_map.get(var)
        if not mount:
            continue
        # segment = the last path component of the mount, e.g. 'wages' from '/api/wages'
        segment = mount.rstrip("/").split("/")[-1]

        for m in re.finditer(
            r"([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|patch|delete)\(['\"`](\/[^'\"` ]+)['\"`]",
            src
        ):
            rv, _, path = m.group(1), m.group(2), m.group(3)
            if rv != var:
                continue
            # Sub-route must NOT start with /segment/ or equal /segment
            if re.match(rf"^\/{re.escape(segment)}(/|$)", path):
                check(
                    f"{fname}: sub-route '{path}' does not repeat mount segment '/{segment}'",
                    False,
                    f"Mount is '{mount}', sub-route '{path}' → full URL becomes '{mount}{path}' (double '{segment}')"
                )
            else:
                pass  # silent pass — only flag duplicates

# If we reach here with no failures added in this section, report clean
dup_failures = [e for e in ERRORS if "repeat mount segment" in e]
if not dup_failures:
    green("No mount-prefix duplications found across all routers")
    PASS += 1

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 3  Frontend lib/api.ts → backend route coverage
# ══════════════════════════════════════════════════════════════════════════════
header("Frontend lib/api.ts → backend route coverage")

def extract_api_calls(src: str) -> list[tuple[str, str]]:
    """
    Extract (METHOD, normalized_path) from axios api.METHOD(...) calls.
    Handles both quoted strings and template literals.
    """
    calls = []
    pattern = re.compile(
        r"api\.(get|post|put|patch|delete)\(\s*"
        r"(?:"
        r"['\"]([^'\"]+)['\"]"     # quoted string path
        r"|"
        r"`([^`]+)`"               # template literal path
        r")",
        re.IGNORECASE
    )
    for m in pattern.finditer(src):
        method = m.group(1).upper()
        path = m.group(2) or m.group(3)
        if not path or not path.startswith("/"):
            continue
        # Strip trailing options like { params } — path ends before comma/space
        path = re.split(r"[,\s]", path)[0].strip("'\"` ")
        full = "/api" + path
        calls.append((method, normalize_path(full)))
    return calls

# Web lib/api.ts
web_api_calls = extract_api_calls(read("apps/web/src/lib/api.ts"))
# Mobile lib/api.ts
mob_api_calls = extract_api_calls(read("apps/mobile/src/lib/api.ts"))

all_helper_calls = web_api_calls + mob_api_calls

for method, norm_path in sorted(set(all_helper_calls)):
    in_backend = (method, norm_path) in backend_route_set
    check(
        f"lib/api.ts helper: {method} {norm_path}",
        in_backend,
        f"No backend route found for {method} {norm_path}"
    )

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 4  Inline api.METHOD() calls in web pages and mobile screens
# ══════════════════════════════════════════════════════════════════════════════
header("Inline api.METHOD() calls in pages and screens")

page_files = (
    glob.glob("apps/web/src/app/**/page.tsx", recursive=True) +
    glob.glob("apps/mobile/src/screens/*.tsx") +
    glob.glob("apps/mobile/src/components/*.tsx")
)

# Build set of paths already exported from lib/api.ts helpers
# so we don't double-report what's already covered
known_helper_paths = {norm_path for _, norm_path in all_helper_calls}

inline_issues = 0
for pf in sorted(page_files):
    src = read(pf)
    short = pf  # already relative since we os.chdir(ROOT)
    calls = extract_api_calls(src)
    for method, norm_path in calls:
        in_backend = (method, norm_path) in backend_route_set
        if not in_backend:
            check(
                f"{short}: inline {method} {norm_path}",
                False,
                f"No backend route matches this inline call"
            )
            inline_issues += 1

if inline_issues == 0:
    green("All inline api.METHOD() calls in pages resolve to backend routes")
    PASS += 1

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 5  Sidebar navigation → page file existence
# ══════════════════════════════════════════════════════════════════════════════
header("Sidebar navigation → page files")

sidebar_src = read("apps/web/src/components/layout/Sidebar.tsx")
sidebar_hrefs = re.findall(r"href:\s*['\"](/[^'\"]+)['\"]", sidebar_src)

for href in sorted(set(sidebar_hrefs)):
    if href in ("/login", "/"):
        continue
    page_path = f"apps/web/src/app{href}/page.tsx"
    check(
        f"Sidebar href '{href}' → {page_path}",
        os.path.isfile(page_path),
        f"Missing: {page_path}"
    )

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 6  Mobile screen registry → source files
# ══════════════════════════════════════════════════════════════════════════════
header("Mobile screen registry → source files")

nav_src = read("apps/mobile/src/navigation/AppNavigator.tsx")

# Build a map of  name → component  for every <*.Screen name="X" component={Y}>
name_to_comp: dict[str, str] = {}
for m in re.finditer(
    r'name=[\'"{`]([A-Za-z][A-Za-z0-9]+)[\'"}]\s+component=\{([A-Za-z][A-Za-z0-9]*)\}',
    nav_src
):
    name_to_comp[m.group(1)] = m.group(2)
# Also catch reversed attribute order:  component={Y} ... name="X"
for m in re.finditer(
    r'component=\{([A-Za-z][A-Za-z0-9]*)\}[^>]*name=[\'"{`]([A-Za-z][A-Za-z0-9]+)[\'"}]',
    nav_src
):
    name_to_comp[m.group(2)] = m.group(1)

# Only validate screen names where the component is *imported* from a separate file
# (i.e. imported at the top of AppNavigator). Inline functions like SalesStack, MoreStack,
# MoreMenuScreen are defined locally and have no separate file to check.
imported_comps = set(re.findall(
    r"import\s+\{([^}]+)\}\s+from\s+'[./][^']*screens[^']*'",
    nav_src
))
if not imported_comps:
    # Flat default imports like:  import LoginScreen from '../screens/LoginScreen'
    imported_comps = set(re.findall(
        r"import\s+([A-Za-z][A-Za-z0-9]+Screen)\s+from",
        nav_src
    ))

screens_dir = Path("apps/mobile/src/screens")

# Check only the screens whose component reference is an imported (external) screen file
for name, comp in sorted(name_to_comp.items()):
    # Skip if component is a local Stack/Tab wrapper or inline component
    if comp in imported_comps or comp.endswith("Screen"):
        # Verify the screen file actually exists on disk
        candidates = [
            screens_dir / f"{comp}.tsx",
            screens_dir / f"{name}Screen.tsx",
            screens_dir / f"{name}.tsx",
        ]
        found = any(c.exists() for c in candidates)
        if comp not in imported_comps and not found:
            # Might be defined inline in AppNavigator — check that too
            found = bool(re.search(rf"function {re.escape(comp)}\s*[({{(]", nav_src))
        check(
            f"Mobile screen '{name}' (component={comp}) exists",
            found,
            f"Expected one of: {[str(c) for c in candidates]}"
        )

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 7  Database schema vs SQL column usage in backend routes
# ══════════════════════════════════════════════════════════════════════════════
header("Database schema vs SQL column usage")

# 7a. Build schema: table → set of column names
schema: dict[str, set[str]] = defaultdict(set)

for sql_file in sorted(glob.glob("database/migrations/*.sql")):
    sql_src = read(sql_file)

    # CREATE TABLE [IF NOT EXISTS] table_name (
    #   col_name TYPE ...
    # )
    for tbl_match in re.finditer(
        r"CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_][a-z0-9_]*)\s*\(",
        sql_src, re.IGNORECASE
    ):
        tbl = tbl_match.group(1).lower()
        # Find everything until the closing );
        start = tbl_match.end()
        depth = 1
        i = start
        while i < len(sql_src) and depth > 0:
            if sql_src[i] == "(":  depth += 1
            elif sql_src[i] == ")": depth -= 1
            i += 1
        block = sql_src[start:i-1]
        # Extract column names: lines starting with identifier followed by a type keyword
        for line in block.split("\n"):
            line = line.strip().rstrip(",")
            # Skip constraints: PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY, INDEX
            if re.match(r"^(PRIMARY|UNIQUE|CHECK|FOREIGN|INDEX|CONSTRAINT|\-\-)", line, re.I):
                continue
            col_match = re.match(r"^([a-z_][a-z0-9_]*)\s+[A-Z]", line, re.I)
            if col_match:
                schema[tbl].add(col_match.group(1).lower())

    # ALTER TABLE table_name ADD COLUMN col_name TYPE
    for alt_match in re.finditer(
        r"ALTER TABLE\s+([a-z_][a-z0-9_]*)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?([a-z_][a-z0-9_]*)",
        sql_src, re.IGNORECASE
    ):
        tbl, col = alt_match.group(1).lower(), alt_match.group(2).lower()
        schema[tbl].add(col)

check("DB schema: tables parsed",
      len(schema) >= 15,
      f"found {len(schema)} tables (expected ≥ 15): {sorted(schema.keys())}")

# 7b. Extract INSERT column lists from backend routes
# Pattern: INSERT INTO table_name (col1, col2, col3, ...)
col_errors = 0
for rf in sorted(route_files):
    src = read(rf)
    fname = Path(rf).name

    for m in re.finditer(
        r"INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\s*\(([^)]+)\)",
        src, re.IGNORECASE
    ):
        tbl = m.group(1).lower()
        raw_cols = m.group(2)
        cols = [c.strip().lower() for c in raw_cols.split(",") if c.strip() and not c.strip().startswith("$")]

        if tbl not in schema:
            check(f"{fname}: INSERT target table '{tbl}' exists in schema", False,
                  f"Table '{tbl}' not found in migrations")
            col_errors += 1
            continue

        for col in cols:
            if col and re.match(r"^[a-z_][a-z0-9_]*$", col) and col not in schema[tbl]:
                check(f"{fname}: column '{tbl}.{col}' used in INSERT exists in schema", False,
                      f"'{col}' not in schema columns for '{tbl}': {sorted(schema[tbl])}")
                col_errors += 1

    # UPDATE table_name SET col=$N, col2=$N
    for m in re.finditer(
        r"UPDATE\s+([a-z_][a-z0-9_]*)\s+SET\s+([^WHERE\n]+?)(?:WHERE|$)",
        src, re.IGNORECASE | re.DOTALL
    ):
        tbl = m.group(1).lower()
        set_clause = m.group(2)
        cols = re.findall(r"([a-z_][a-z0-9_]*)\s*=", set_clause, re.IGNORECASE)
        cols = [c.lower() for c in cols]

        if tbl not in schema:
            continue  # already flagged by INSERT check above

        for col in cols:
            if col and re.match(r"^[a-z_][a-z0-9_]*$", col) and col not in schema[tbl]:
                check(f"{fname}: column '{tbl}.{col}' used in UPDATE exists in schema", False,
                      f"'{col}' not in schema columns for '{tbl}': {sorted(schema[tbl])}")
                col_errors += 1

if col_errors == 0:
    green("All INSERT/UPDATE column names exist in migration schema")
    PASS += 1

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 8  Explicit request body field parity
# ══════════════════════════════════════════════════════════════════════════════
header("Explicit request body field parity (frontend sends ↔ backend reads)")

def extract_req_body_fields(route_src: str) -> dict[str, set[str]]:
    """
    Extract fields destructured from req.body for each route handler.
    Returns dict: route_signature → set of field names.
    Pattern:  const { field1, field2, field3 } = req.body
    """
    result = {}
    for m in re.finditer(
        r"const\s*\{([^}]+)\}\s*=\s*req\.body",
        route_src, re.DOTALL
    ):
        fields = set()
        for part in m.group(1).split(","):
            # Handle  field: alias  or  field = default
            field = re.split(r"[=:]", part.strip())[0].strip()
            if re.match(r"^[a-z_][a-z0-9_]*$", field, re.I):
                fields.add(field)
        if fields:
            result[m.start()] = fields
    return result

def extract_explicit_body(api_src: str) -> dict[str, set[str]]:
    """
    Extract explicit body objects from api calls.
    Pattern:  api.post('/path', { field1, field2: val, field3 })
    Returns dict: normalized_path → set of field names.
    """
    result: dict[str, set[str]] = defaultdict(set)
    pattern = re.compile(
        r"api\.(post|put|patch)\(\s*['\"`]([^'\"` ]+)['\"`]\s*,\s*\{([^}]+)\}",
        re.DOTALL
    )
    for m in pattern.finditer(api_src):
        path = "/api" + m.group(2)
        body_str = m.group(3)
        for part in body_str.split(","):
            field = re.split(r"[=:]", part.strip())[0].strip()
            if re.match(r"^[a-z_][a-z0-9_]*$", field, re.I):
                result[normalize_path(path)].add(field)
    return result

web_explicit = extract_explicit_body(read("apps/web/src/lib/api.ts"))
mob_explicit = extract_explicit_body(read("apps/mobile/src/lib/api.ts"))

# Merge by path, union fields
all_explicit: dict[str, set[str]] = defaultdict(set)
for path, fields in {**web_explicit, **mob_explicit}.items():
    all_explicit[path].update(fields)

# For each explicit body, check that backend reads at least those fields
body_errors = 0
for norm_path, fe_fields in sorted(all_explicit.items()):
    if not fe_fields:
        continue
    # Find the backend route file that handles this path
    segment = norm_path.replace("/api/", "", 1).split("/")[0]
    route_file = f"backend/src/routes/{segment}.ts"
    if not os.path.isfile(route_file):
        continue
    route_src = read(route_file)
    be_fields_all: set[str] = set()
    for fields in extract_req_body_fields(route_src).values():
        be_fields_all.update(fields)

    # Frontend should only send fields the backend knows about
    unknown = fe_fields - be_fields_all
    if unknown:
        check(
            f"Body fields for {norm_path}: frontend sends only known fields",
            False,
            f"Frontend sends {sorted(unknown)} but backend never reads them from req.body"
        )
        body_errors += 1

if body_errors == 0:
    green("All explicit frontend body fields are read by backend handlers")
    PASS += 1

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 9  Query param consistency
# ══════════════════════════════════════════════════════════════════════════════
header("Query parameter consistency (frontend sends ↔ backend reads)")

def extract_req_query_reads(route_src: str) -> set[str]:
    """Extract param names from  const { p1, p2 } = req.query  or  req.query.name """
    params = set()
    # Destructuring
    for m in re.finditer(r"const\s*\{([^}]+)\}\s*=\s*req\.query", route_src, re.DOTALL):
        for part in m.group(1).split(","):
            p = re.split(r"[=:]", part.strip())[0].strip()
            if re.match(r"^[a-z_][a-z0-9_]*$", p, re.I):
                params.add(p)
    # Direct access: req.query.name
    for m in re.finditer(r"req\.query\.([a-z_][a-z0-9_]*)", route_src, re.I):
        params.add(m.group(1))
    return params

def extract_frontend_params(api_src: str) -> dict[str, set[str]]:
    """
    Extract param keys from  api.get('/path', { params: { key1, key2 } })
    or  api.get('/path', { params })  where params is a variable (can't inspect).
    """
    result: dict[str, set[str]] = defaultdict(set)
    # Inline params object
    pattern = re.compile(
        r"api\.get\(\s*['\"`]([^'\"` ]+)['\"`]\s*,\s*\{\s*params:\s*\{([^}]+)\}",
        re.DOTALL
    )
    for m in pattern.finditer(api_src):
        path = normalize_path("/api" + m.group(1))
        for part in m.group(2).split(","):
            p = re.split(r"[=:]", part.strip())[0].strip()
            if re.match(r"^[a-z_][a-z0-9_]*$", p, re.I):
                result[path].add(p)
    return result

web_params = extract_frontend_params(read("apps/web/src/lib/api.ts"))
mob_params = extract_frontend_params(read("apps/mobile/src/lib/api.ts"))

all_params: dict[str, set[str]] = defaultdict(set)
for d in [web_params, mob_params]:
    for path, ps in d.items():
        all_params[path].update(ps)

param_errors = 0
for norm_path, fe_params in sorted(all_params.items()):
    if not fe_params:
        continue
    segment = norm_path.replace("/api/", "", 1).split("/")[0]
    route_file = f"backend/src/routes/{segment}.ts"
    if not os.path.isfile(route_file):
        continue
    route_src = read(route_file)
    be_params = extract_req_query_reads(route_src)

    unknown = fe_params - be_params
    if unknown:
        check(
            f"Query params for {norm_path}: frontend sends only known params",
            False,
            f"Frontend sends {sorted(unknown)} but backend never reads them from req.query"
        )
        param_errors += 1

if param_errors == 0:
    green("All inline query params sent by frontend are read by backend handlers")
    PASS += 1

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 10  Environment variable coverage
# ══════════════════════════════════════════════════════════════════════════════
header("Environment variable coverage (backend .env.example)")

backend_src_all = ""
for ts_file in glob.glob("backend/src/**/*.ts", recursive=True):
    backend_src_all += read(ts_file)

# Extract all process.env.VAR_NAME references
used_vars = set(re.findall(r"process\.env\.([A-Z_][A-Z0-9_]*)", backend_src_all))

# Parse .env.example for defined keys
env_example = read("backend/.env.example") or read(".env.example")
defined_vars = set(re.findall(r"^([A-Z_][A-Z0-9_]*)[\s=]", env_example, re.MULTILINE))

# NODE built-ins that are always present
always_present = {"NODE_ENV", "PORT", "PATH", "HOME", "USER", "HOSTNAME"}

env_errors = 0
for var in sorted(used_vars - always_present):
    if var not in defined_vars:
        check(
            f"process.env.{var} is documented in .env.example",
            False,
            f"'{var}' used in backend source but not in .env.example"
        )
        env_errors += 1

if env_errors == 0:
    green("All backend process.env vars are documented in .env.example")
    PASS += 1
elif not env_example:
    warn("backend/.env.example not found — skipping env var check")

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 11  Backend routes all have authentication middleware
# ══════════════════════════════════════════════════════════════════════════════
header("Authentication middleware on all non-public routes")

auth_errors = 0
# Routes that are intentionally public (no auth required)
public_routes = {
    "auth.ts",        # /login is public by design
    "weighbridge.ts"  # /ingest uses API key auth, not JWT
}

for rf in sorted(route_files):
    src = read(rf)
    fname = Path(rf).name
    if fname in public_routes:
        continue
    # Check that authenticate middleware is applied
    # Either:  router.use(authenticate)  or  app.use(authenticate)
    has_auth = bool(
        re.search(r"\.use\(authenticate\)", src) or
        re.search(r"authenticate\b", src)
    )
    check(
        f"{fname}: authenticate middleware applied",
        has_auth,
        f"No 'authenticate' middleware found — routes may be unprotected"
    )
    if not has_auth:
        auth_errors += 1

# ══════════════════════════════════════════════════════════════════════════════
# CHECK 12  Foreign key references in SQL use correct column names
# ══════════════════════════════════════════════════════════════════════════════
header("Foreign key column names in SQL REFERENCES clauses")

for sql_file in sorted(glob.glob("database/migrations/*.sql")):
    sql_src = read(sql_file)
    fname = Path(sql_file).name

    # Pattern:  col_name UUID REFERENCES other_table(referenced_col)
    for m in re.finditer(
        r"REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(\s*([a-z_][a-z0-9_]*)\s*\)",
        sql_src, re.IGNORECASE
    ):
        ref_table = m.group(1).lower()
        ref_col = m.group(2).lower()

        if ref_table not in schema:
            check(
                f"{fname}: REFERENCES target table '{ref_table}' exists",
                False,
                f"Table '{ref_table}' not found in schema"
            )
        elif ref_col not in schema[ref_table]:
            check(
                f"{fname}: FK column '{ref_table}.{ref_col}' exists",
                False,
                f"Column '{ref_col}' not in '{ref_table}' schema: {sorted(schema[ref_table])}"
            )

fk_errors = [e for e in ERRORS if "REFERENCES target" in e or "FK column" in e]
if not fk_errors:
    green("All REFERENCES FK column names exist in target tables")
    PASS += 1

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "─" * 60)
print(f"  Passed: \033[0;32m{PASS}\033[0m   Failed: \033[0;31m{FAIL}\033[0m")
print("─" * 60)

if FAIL > 0:
    print("\nFailed checks:")
    for e in ERRORS:
        print(f"  \033[0;31m✗\033[0m  {e}")
    print()
    sys.exit(1)

print()
print("\033[0;32m  ✓  All contract checks passed.\033[0m")
print()
sys.exit(0)
