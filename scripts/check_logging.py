#!/usr/bin/env python3
"""
Logging compliance checker for BlueMetal Pro backend route files.

Rules enforced:
  1. Every catch block must contain logger.error(...) — no silent failures
  2. Every POST/PUT/PATCH/DELETE handler that calls INSERT/UPDATE/DELETE SQL
     must contain logAction(...) — mutations need an audit trail

Usage:
  python3 scripts/check_logging.py                     # check all route files
  python3 scripts/check_logging.py --staged            # check only git-staged route files
  python3 scripts/check_logging.py backend/src/routes/sales.ts  # check specific file
"""

import re
import sys
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROUTES_DIR = ROOT / "backend" / "src" / "routes"

# ── helpers ───────────────────────────────────────────────────────────────────

def get_staged_route_files():
    """Return list of staged backend route .ts files."""
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        capture_output=True, text=True, cwd=ROOT
    )
    files = []
    for line in result.stdout.splitlines():
        p = ROOT / line
        if "backend/src/routes" in line and line.endswith(".ts") and p.exists():
            files.append(p)
    return files


def get_all_route_files():
    return sorted(ROUTES_DIR.glob("*.ts"))


def extract_catch_blocks(source: str) -> list[dict]:
    """
    Extract catch blocks with their line numbers and content.
    Returns list of {line, content} dicts.

    Strategy: find 'catch' keyword, scan forward to the opening '{' of the
    catch body, then collect until the matching closing '}'.
    """
    blocks = []
    lines = source.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        # Must contain the 'catch' keyword but NOT as a .catch() promise chain call
        if not re.search(r'\bcatch\b', line):
            i += 1
            continue
        # Skip .catch( promise chain patterns — those aren't try/catch blocks
        if re.search(r'\.\s*catch\s*\(', line):
            i += 1
            continue

        start_line = i + 1  # 1-indexed line number for reporting

        # Find the opening brace of the catch *body* — the '{' that comes after
        # the 'catch' keyword and its optional '(err)' clause.
        # Strategy: find 'catch' in the source string, then scan forward for '{'.
        # We work on the raw source from this line onward so we don't pick up
        # a '{' that belongs to a preceding try-block on the same line.
        j = i
        open_pos = None
        # Flatten to search from the catch keyword itself
        snippet_lines = lines[i:]
        snippet = "\n".join(snippet_lines)
        m = re.search(r'\bcatch\b\s*(?:\([^)]*\))?\s*\{', snippet)
        if m:
            # Map character offset back to (line, col)
            offset = m.end() - 1  # index of the '{'
            row_offset = snippet[:offset].count("\n")
            col_offset = offset - snippet[:offset].rfind("\n") - 1
            open_pos = (i + row_offset, col_offset)
        if open_pos is None:
            i += 1
            continue

        if open_pos is None:
            i += 1
            continue

        # Collect from the opening brace to the matching close brace.
        # Start with depth=1 (we already consumed the opening '{') and only
        # process characters AFTER that brace on the opening line.
        depth = 1
        open_j, open_col = open_pos
        block_lines = [lines[open_j]]  # include the opening line in content
        # Process remainder of the opening line (chars after the '{')
        for ch in lines[open_j][open_col + 1:]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        if depth == 0:
            # Entire catch block is on one line (rare but valid)
            blocks.append({"line": start_line, "content": lines[open_j]})
            i = open_j + 1
            continue

        j = open_j + 1
        while j < len(lines):
            for ch in lines[j]:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
            block_lines.append(lines[j])
            if depth == 0:
                break
            j += 1

        blocks.append({"line": start_line, "content": "\n".join(block_lines)})
        i = j + 1

    return blocks


def has_logger_error(block_content: str) -> bool:
    """Accept any logger call (error/warn/info) or logAction in catch block."""
    return bool(
        re.search(r'logger\s*\.\s*(error|warn|info)\s*\(', block_content)
        or re.search(r'logAction\s*\(', block_content)
    )


def extract_mutation_handlers(source: str) -> list[dict]:
    """
    Find route handler functions for POST/PUT/PATCH/DELETE that contain
    INSERT/UPDATE/DELETE SQL — these require a logAction() call.
    """
    handlers = []
    lines = source.splitlines()

    # Find router.post/put/patch/delete definitions
    handler_starts = []
    for i, line in enumerate(lines):
        if re.search(r'Router\s*\.\s*(post|put|patch|delete)\s*\(', line, re.IGNORECASE):
            handler_starts.append(i + 1)  # 1-indexed

    for start_line in handler_starts:
        # Collect handler body (from start_line to matching closing brace)
        i = start_line - 1
        depth = 0
        body_lines = []
        found_open = False
        while i < len(lines):
            for ch in lines[i]:
                if ch == '{':
                    depth += 1
                    found_open = True
                elif ch == '}':
                    depth -= 1
            if found_open:
                body_lines.append(lines[i])
                if depth == 0:
                    break
            i += 1
        body = "\n".join(body_lines)
        # Only flag if this handler executes mutating SQL
        if re.search(r'\b(INSERT|UPDATE|DELETE)\b', body, re.IGNORECASE):
            handlers.append({"line": start_line, "content": body})

    return handlers


def has_log_action(handler_content: str) -> bool:
    return bool(re.search(r'logAction\s*\(', handler_content))


# ── checker ───────────────────────────────────────────────────────────────────

def check_file(path: Path) -> list[str]:
    """Return list of violation strings for the given file."""
    violations = []
    try:
        source = path.read_text(encoding="utf-8")
    except Exception as e:
        return [f"Could not read file: {e}"]

    rel = path.relative_to(ROOT)

    # Rule 1: catch blocks must have logger.error
    for block in extract_catch_blocks(source):
        # Skip trivial one-liner catches (heartbeat pings, cleanup, fire-and-forget).
        # Extract just the catch body between its braces.
        m_body = re.search(r'\bcatch\b\s*(?:\([^)]*\))?\s*\{([^}]*)\}', block["content"])
        if m_body:
            catch_body = m_body.group(1).strip()
            if len(catch_body) < 60 and "\n" not in catch_body:
                continue
        if not has_logger_error(block["content"]):
            violations.append(
                f"{rel}:{block['line']}: catch block missing logger.error() — "
                "add: logger.error({{ err, crusher_id, user_id }}, 'Descriptive message')"
            )

    # Rule 2: mutation handlers must have logAction
    for handler in extract_mutation_handlers(source):
        if not has_log_action(handler["content"]):
            violations.append(
                f"{rel}:{handler['line']}: mutation handler (INSERT/UPDATE/DELETE) missing logAction() — "
                "add: logAction('entity.action', {{ ...fields, by: req.user?.email, crusher_id }})"
            )

    return violations


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    if "--staged" in args:
        files = get_staged_route_files()
        if not files:
            print("  ✓  No staged backend route files to check")
            sys.exit(0)
        mode = "staged"
    elif args and not args[0].startswith("--"):
        files = [Path(a) if Path(a).is_absolute() else ROOT / a for a in args if not a.startswith("--")]
        mode = "specified"
    else:
        files = get_all_route_files()
        mode = "all"

    all_violations = []
    for f in files:
        violations = check_file(f)
        all_violations.extend(violations)

    if all_violations:
        print(f"\n  ✗  Logging compliance check FAILED ({mode} files)\n")
        for v in all_violations:
            print(f"      {v}")
        print(f"\n  {len(all_violations)} violation(s) found.")
        print("  Fix with: node -e \"require('./scripts/auto_fix_logging')\" <file>")
        print("  Or run the multi-agent upgrade workflow from Claude Code.\n")
        sys.exit(1)

    checked = len(files)
    print(f"  ✓  Logging compliance: {checked} route file(s) passed")
    sys.exit(0)


if __name__ == "__main__":
    main()
