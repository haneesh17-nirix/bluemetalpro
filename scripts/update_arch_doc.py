#!/usr/bin/env python3
"""
Update the "Current Deployed Version" badge/line in docs/architecture.md.

Usage:
  python3 scripts/update_arch_doc.py <version>

Replaces the first occurrence of:
  <!-- version: x.y.z -->
with:
  <!-- version: <new> -->

and the "Current version" table cell (if present).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ARCH_DOC = ROOT / "docs" / "architecture.md"


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    new_ver = sys.argv[1].lstrip("v")

    if not ARCH_DOC.exists():
        print(f"⚠  {ARCH_DOC} not found — skipping architecture doc update")
        sys.exit(0)

    text = ARCH_DOC.read_text()

    # Replace <!-- version: x.y.z --> comment
    text, n1 = re.subn(
        r"<!-- version: [0-9]+\.[0-9]+\.[0-9]+ -->",
        f"<!-- version: {new_ver} -->",
        text,
    )

    # Replace | **Version** | x.y.z | table row (if present)
    text, n2 = re.subn(
        r"(\|\s*\*\*Version\*\*\s*\|\s*)[0-9]+\.[0-9]+\.[0-9]+(\s*\|)",
        rf"\g<1>{new_ver}\g<2>",
        text,
    )

    # Replace bare "Version: x.y.z" line
    text, n3 = re.subn(
        r"(Version:\s*)[0-9]+\.[0-9]+\.[0-9]+",
        rf"\g<1>{new_ver}",
        text,
    )

    ARCH_DOC.write_text(text)
    total = n1 + n2 + n3
    if total:
        print(f"✓ docs/architecture.md: updated {total} version reference(s) → {new_ver}")
    else:
        print(f"ℹ  docs/architecture.md: no version placeholders found (no changes)")


if __name__ == "__main__":
    main()
