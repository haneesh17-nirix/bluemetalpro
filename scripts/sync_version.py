#!/usr/bin/env python3
"""
Sync version across all package.json files and the VERSION file.

Usage:
  python3 scripts/sync_version.py bump <major|minor|patch>
  python3 scripts/sync_version.py set  <x.y.z>
  python3 scripts/sync_version.py get
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

PACKAGE_FILES = [
    ROOT / "package.json",
    ROOT / "backend" / "package.json",
    ROOT / "apps" / "web" / "package.json",
    ROOT / "apps" / "mobile" / "package.json",
    ROOT / "packages" / "shared" / "package.json",
    ROOT / "packages" / "weighbridge-agent" / "package.json",
]

VERSION_FILE = ROOT / "VERSION"


def read_version() -> str:
    if VERSION_FILE.exists():
        return VERSION_FILE.read_text().strip()
    # Fall back to root package.json
    data = json.loads((ROOT / "package.json").read_text())
    return data.get("version", "0.0.0")


def write_version(v: str) -> None:
    VERSION_FILE.write_text(v + "\n")
    for pf in PACKAGE_FILES:
        if not pf.exists():
            continue
        data = json.loads(pf.read_text())
        data["version"] = v
        pf.write_text(json.dumps(data, indent=2) + "\n")
    print(f"✓ All package.json + VERSION → {v}")


def bump(current: str, kind: str) -> str:
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)", current)
    if not m:
        raise ValueError(f"Cannot parse version: {current}")
    major, minor, patch = int(m[1]), int(m[2]), int(m[3])
    if kind == "major":
        return f"{major + 1}.0.0"
    elif kind == "minor":
        return f"{major}.{minor + 1}.0"
    elif kind == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        raise ValueError(f"Unknown bump kind: {kind}")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    current = read_version()

    if cmd == "get":
        print(current)

    elif cmd == "bump":
        if len(sys.argv) < 3:
            print("Usage: sync_version.py bump <major|minor|patch>")
            sys.exit(1)
        new_ver = bump(current, sys.argv[2])
        write_version(new_ver)

    elif cmd == "set":
        if len(sys.argv) < 3:
            print("Usage: sync_version.py set <x.y.z>")
            sys.exit(1)
        write_version(sys.argv[2])

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
