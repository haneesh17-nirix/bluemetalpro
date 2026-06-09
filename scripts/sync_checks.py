#!/usr/bin/env python3
"""
sync_checks.py — keeps check.sh's REQUIRED file list in sync with the repo.

Usage:
  python3 scripts/sync_checks.py          # update check.sh in-place
  python3 scripts/sync_checks.py --verify # exit 1 if list is stale (CI mode)

Auto-discovers:
  - database/migrations/*.sql
  - backend/src/routes/*.ts
  - backend/src/services/*.ts  (pdfGenerator, notifications, etc.)
  - apps/web/src/app/**/page.tsx
  - apps/mobile/src/screens/*Screen.tsx
  - .github/workflows/*.yml
"""
import os, re, sys, glob
from pathlib import Path

ROOT = Path(__file__).parent.parent
CHECKSH = ROOT / 'scripts' / 'check.sh'
VERIFY = '--verify' in sys.argv

def discover():
    files = []

    # ── always-required root files ────────────────────────────────────────────
    files += [
        'CHANGELOG.md', 'VERSIONING.md', 'README.md',
        '.editorconfig', '.gitignore',
        'VERSION',
        'docs/architecture.md', 'docs/hardware-setup.md',
        'infra/main.bicep',
    ]

    # ── migrations ────────────────────────────────────────────────────────────
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / 'database' / 'migrations').glob('*.sql'))
    )

    # ── backend core + routes + services ─────────────────────────────────────
    files += ['backend/src/index.ts', 'backend/.env.example']
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / 'backend' / 'src' / 'routes').glob('*.ts'))
    )
    # key services only (exclude generated / test files)
    for svc in ['pdfGenerator.ts', 'notifications.ts']:
        p = ROOT / 'backend' / 'src' / 'services' / svc
        if p.exists():
            files.append(p.relative_to(ROOT).as_posix())

    # ── shared package ────────────────────────────────────────────────────────
    files += ['packages/shared/src/index.ts']
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / 'packages' / 'shared' / 'src' / 'types').glob('*.ts'))
    )
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / 'packages' / 'shared' / 'src' / 'utils').glob('*.ts'))
    )

    # ── weighbridge agent ─────────────────────────────────────────────────────
    files += [
        'packages/weighbridge-agent/src/index.ts',
        'packages/weighbridge-agent/.env.example',
    ]

    # ── web pages (any page.tsx under app/) ──────────────────────────────────
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / 'apps' / 'web' / 'src' / 'app').rglob('page.tsx'))
    )

    # ── mobile screens ────────────────────────────────────────────────────────
    files += ['apps/mobile/App.tsx', 'apps/mobile/index.js', 'apps/mobile/app.json', 'apps/mobile/eas.json']
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / 'apps' / 'mobile' / 'src' / 'screens').glob('*Screen.tsx'))
    )

    # ── CI workflows ──────────────────────────────────────────────────────────
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in sorted((ROOT / '.github' / 'workflows').glob('*.yml'))
    )

    # deduplicate preserving order, keep only files that actually exist
    seen = set()
    result = []
    for f in files:
        if f not in seen:
            seen.add(f)
            if (ROOT / f).exists():
                result.append(f)
    return result

def build_required_block(files):
    lines = ['REQUIRED=(']
    groups = {
        'Root':             [f for f in files if '/' not in f or f.startswith('docs/')],
        'Database':         [f for f in files if f.startswith('database/')],
        'Backend':          [f for f in files if f.startswith('backend/')],
        'Shared package':   [f for f in files if f.startswith('packages/shared/')],
        'Weighbridge agent':[f for f in files if f.startswith('packages/weighbridge-agent/')],
        'Web pages':        [f for f in files if f.startswith('apps/web/')],
        'Mobile':           [f for f in files if f.startswith('apps/mobile/')],
        'CI workflows':     [f for f in files if f.startswith('.github/')],
    }
    for group, items in groups.items():
        if not items:
            continue
        lines.append(f'  # {group}')
        for item in items:
            lines.append(f'  {item}')
    lines.append(')')
    return '\n'.join(lines)

def update_checksh(files):
    text = CHECKSH.read_text()
    new_block = build_required_block(files)

    # Replace the REQUIRED=( ... ) block
    pattern = r'REQUIRED=\(.*?\)'
    new_text = re.sub(pattern, new_block, text, flags=re.DOTALL)

    if new_text == text:
        return False  # no change
    CHECKSH.write_text(new_text)
    return True

def verify(files):
    """Return list of files that are in discover() but missing from check.sh"""
    text = CHECKSH.read_text()
    m = re.search(r'REQUIRED=\((.*?)\)', text, re.DOTALL)
    if not m:
        return files  # can't parse → report all as missing
    current = set(re.findall(r'^\s+([^\s#][^\s]+)\s*$', m.group(1), re.MULTILINE))
    return [f for f in files if f not in current]

if __name__ == '__main__':
    files = discover()

    if VERIFY:
        missing = verify(files)
        stale   = [f for f in re.findall(
            r'^\s+([^\s#][^\s]+)\s*$',
            re.search(r'REQUIRED=\((.*?)\)', CHECKSH.read_text(), re.DOTALL).group(1),
            re.MULTILINE
        ) if not (ROOT / f).exists()]

        if missing or stale:
            if missing:
                print(f'\033[0;31m  ✗  check.sh REQUIRED list is missing {len(missing)} file(s):\033[0m')
                for f in missing:
                    print(f'       + {f}')
            if stale:
                print(f'\033[0;31m  ✗  check.sh REQUIRED list has {len(stale)} deleted file(s):\033[0m')
                for f in stale:
                    print(f'       - {f}')
            print('\033[0;33m  ℹ  Run: python3 scripts/sync_checks.py\033[0m')
            sys.exit(1)
        print(f'\033[0;32m  ✓  check.sh REQUIRED list is up to date ({len(files)} files)\033[0m')
    else:
        changed = update_checksh(files)
        if changed:
            print(f'\033[0;32m  ✓  Updated check.sh REQUIRED list ({len(files)} files)\033[0m')
        else:
            print(f'\033[0;32m  ✓  check.sh REQUIRED list already up to date ({len(files)} files)\033[0m')
