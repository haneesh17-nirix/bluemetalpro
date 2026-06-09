#!/usr/bin/env python3
"""
Prepend a changelog entry to CHANGELOG.md for a new release.

Usage:
  python3 scripts/update_changelog.py <new-version> [<prev-tag>]

  new-version : the version just bumped to, e.g. "1.2.3"
  prev-tag    : the previous git tag to diff from (empty = all history)

Reads git log commits since prev-tag, groups them by conventional commit
type, then prepends a formatted section to CHANGELOG.md.
"""
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent.parent
CHANGELOG = ROOT / "CHANGELOG.md"

SECTION_ORDER = ["feat", "fix", "perf", "refactor", "docs", "ci", "chore", "other"]
SECTION_LABELS = {
    "feat":     "Features",
    "fix":      "Bug Fixes",
    "perf":     "Performance",
    "refactor": "Refactoring",
    "docs":     "Documentation",
    "ci":       "CI / DevOps",
    "chore":    "Chores",
    "other":    "Other Changes",
}


def git_log(since_tag: str) -> list[str]:
    if since_tag:
        rev_range = f"{since_tag}..HEAD"
    else:
        rev_range = "HEAD"
    result = subprocess.run(
        ["git", "log", rev_range, "--pretty=format:%s|||%h"],
        capture_output=True, text=True, cwd=ROOT
    )
    lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
    return lines


def parse_commits(lines: list[str]) -> dict[str, list[str]]:
    """Return {type: [formatted message, ...]}."""
    # Skip release-bump commits
    SKIP_RE = re.compile(r"^chore\(release\):")
    # Conventional commit: type(scope)!: description
    CC_RE = re.compile(r"^(\w+)(\([^)]+\))?(!)?: (.+)")

    groups: dict[str, list[str]] = {k: [] for k in SECTION_ORDER}

    for line in lines:
        subject, _, sha = line.partition("|||")
        if SKIP_RE.match(subject):
            continue

        m = CC_RE.match(subject)
        if m:
            kind = m.group(1).lower()
            scope = m.group(2) or ""
            breaking = m.group(3) or ""
            desc = m.group(4)
            label = f"`{scope[1:-1]}` " if scope else ""
            prefix = "**BREAKING** " if breaking else ""
            msg = f"- {prefix}{label}{desc} ([{sha}])"
            bucket = kind if kind in groups else "other"
            groups[bucket].append(msg)
        else:
            groups["other"].append(f"- {subject} ([{sha}])")

    return groups


def build_section(version: str, groups: dict[str, list[str]]) -> str:
    today = date.today().isoformat()
    lines = [f"## [{version}] — {today}\n"]
    for kind in SECTION_ORDER:
        items = groups.get(kind, [])
        if not items:
            continue
        lines.append(f"\n### {SECTION_LABELS[kind]}\n")
        lines.extend(items)
    lines.append("\n")
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    new_version = sys.argv[1]
    prev_tag = sys.argv[2] if len(sys.argv) > 2 else ""

    commits = git_log(prev_tag)
    groups = parse_commits(commits)
    section = build_section(new_version, groups)

    existing = CHANGELOG.read_text() if CHANGELOG.exists() else ""

    if not existing.startswith("# Changelog"):
        header = "# Changelog\n\nAll notable changes to BlueMetal Pro are documented here.\n\n"
        existing = header + existing

    # Insert after the first line (the # Changelog header)
    header_end = existing.find("\n\n") + 2
    new_content = existing[:header_end] + section + existing[header_end:]
    CHANGELOG.write_text(new_content)
    print(f"✓ CHANGELOG.md updated with v{new_version} ({len(commits)} commits)")


if __name__ == "__main__":
    main()
