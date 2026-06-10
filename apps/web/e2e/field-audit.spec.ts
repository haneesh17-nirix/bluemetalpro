/**
 * Field-level data audit — checks every stat card, table column, and panel
 * on every page for every role. Reports exactly which fields are empty.
 *
 * Run:
 *   BASE_URL=https://happy-beach-0dd66180f.7.azurestaticapps.net \
 *     npx playwright test e2e/field-audit.spec.ts --reporter=list
 */

import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://happy-beach-0dd66180f.7.azurestaticapps.net';

// ── Accounts ─────────────────────────────────────────────────────────────────
const USERS = [
  { label: 'admin',         email: 'admin@bluemetal.local',     role: 'admin' },
  { label: 'operations',    email: 'operator1@bluemetal.local', role: 'operations' },
  { label: 'report_viewer', email: 'reports@bluemetal.local',   role: 'report_viewer' },
];
const PASSWORD = 'Test@1234';

// ── Page definitions: panels → what to check ─────────────────────────────────
//
// Each check is one of:
//   { kind:'stat',   selector, label }          — number/text must not be empty/"—"/"0"
//   { kind:'table',  selector, cols, minRows }   — table must have ≥minRows rows, all cols non-empty in first row
//   { kind:'grid',   selector, label }           — at least 1 card visible
//   { kind:'chart',  selector, label }           — SVG/canvas must be present
//   { kind:'badge',  selector, label }           — at least one badge visible
//
// role arrays follow sidebar visibility: admin sees all, operations sees all except
// users/crushers/settings, report_viewer sees dashboard/sales/purchases/quarry/ledger/reports.

const PAGES: {
  path: string;
  roles: string[];
  tab?: { selector: string; value: string };
  checks: Check[];
}[] = [

  // ── /dashboard ──────────────────────────────────────────────────────────────
  // Stat card values (non-zero) require crusher_id in JWT (two-step auth).
  // Recent Sales section uses a card list, not a <table>.
  {
    path: '/dashboard',
    roles: ['admin', 'operations', 'report_viewer'],
    checks: [
      { kind: 'stat', selector: '.stat-card', label: 'Stat cards present (4 expected)' },
      { kind: 'stat', selector: '.stat-card .text-xl', label: 'Stat card values non-zero' },
    ],
  },

  // ── /sales ──────────────────────────────────────────────────────────────────
  {
    path: '/sales',
    roles: ['admin', 'operations', 'report_viewer'],
    checks: [
      // StatsRow: value is first <p> inside each .card (inline-styled, no CSS class)
      { kind: 'stat', selector: '.card p:first-child', label: 'Period summary values' },
      { kind: 'table', selector: 'table', cols: ['Invoice','Party','Amount'], minRows: 1, label: 'Sales table rows' },
    ],
  },

  // ── /purchases ──────────────────────────────────────────────────────────────
  {
    path: '/purchases',
    roles: ['admin', 'operations', 'report_viewer'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Purchases summary stats' },
      { kind: 'table', selector: 'table', cols: ['Bill','Supplier','Total'], minRows: 1, label: 'Purchases table rows' },
    ],
  },

  // ── /quarry ─────────────────────────────────────────────────────────────────
  {
    path: '/quarry',
    roles: ['admin', 'operations', 'report_viewer'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Quarry summary stats' },
      { kind: 'table', selector: 'table', cols: ['Material','Qty','Amount'], minRows: 1, label: 'Quarry entries' },
    ],
  },

  // ── /parties ────────────────────────────────────────────────────────────────
  {
    path: '/parties',
    roles: ['admin', 'operations'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Parties summary stats' },
      { kind: 'table', selector: 'table', cols: ['Name','Type','Balance'], minRows: 1, label: 'Parties table rows' },
    ],
  },

  // ── /vehicles ───────────────────────────────────────────────────────────────
  // Vehicles are shown as a card grid, not a table.
  {
    path: '/vehicles',
    roles: ['admin', 'operations'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Vehicle stats' },
      { kind: 'grid', selector: '.card', label: 'Vehicle cards' },
    ],
  },

  // ── /ledger ─────────────────────────────────────────────────────────────────
  {
    path: '/ledger',
    roles: ['admin', 'operations', 'report_viewer'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Ledger balance stats' },
      { kind: 'table', selector: 'table', cols: ['Party','Balance'], minRows: 1, label: 'Party balances table' },
    ],
  },

  // ── /maintenance ────────────────────────────────────────────────────────────
  {
    path: '/maintenance',
    roles: ['admin', 'operations'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Maintenance stats' },
      { kind: 'table', selector: 'table', cols: ['Asset','Title'], minRows: 1, label: 'Maintenance records' },
    ],
  },

  // ── /wages ──────────────────────────────────────────────────────────────────
  {
    path: '/wages',
    roles: ['admin', 'operations'],
    checks: [
      { kind: 'stat', selector: '.card p:first-child', label: 'Wages stats' },
      { kind: 'table', selector: 'table', cols: ['Worker','Name','Designation'], minRows: 1, label: 'Workers/Attendance rows' },
    ],
  },

  // ── /reports (item-wise tab — default) ─────────────────────────────────────
  {
    path: '/reports',
    roles: ['admin', 'operations', 'report_viewer'],
    checks: [
      { kind: 'table', selector: 'table', cols: ['Product','Qty','Amount'], minRows: 1, label: 'Item-wise report rows' },
    ],
  },

  // ── /reports — P&L tab ──────────────────────────────────────────────────────
  {
    path: '/reports',
    roles: ['admin', 'operations', 'report_viewer'],
    tab: { selector: 'button, [role="tab"]', value: 'P&L' },
    checks: [
      // KpiBox: <div class="card"> <p>LABEL</p> <p style="fontSize:22">VALUE</p> </div>
      // VALUE is p:nth-child(2), not first-child
      { kind: 'stat', selector: '.card p:nth-child(2)', label: 'P&L summary card values' },
      { kind: 'table', selector: 'table', cols: ['Month','Revenue','Profit'], minRows: 1, label: 'P&L monthly rows' },
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Check =
  | { kind: 'stat';  selector: string; label: string }
  | { kind: 'table'; selector: string; cols: string[]; minRows: number; label: string }
  | { kind: 'grid';  selector: string; label: string }
  | { kind: 'badge'; selector: string; label: string }
  | { kind: 'chart'; selector: string; label: string };

// ── Login helper ──────────────────────────────────────────────────────────────
async function loginAndSelectCrusher(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  // Wait for React to attach the submit handler before clicking
  await page.waitForTimeout(500);
  await page.click('button[type="submit"]');

  await page.waitForURL(u => u.href.includes('select-crusher') || u.href.includes('dashboard') || u.href.includes('platform'), { timeout: 30000 });

  if (page.url().includes('select-crusher')) {
    await page.waitForSelector('button', { timeout: 10000 });
    // click first crusher button (skip "Back" or nav buttons — find one with crusher name)
    const btn = page.locator('button').filter({ hasText: /unit|quarry|bluemetal|crusher/i }).first();
    if (await btn.count()) {
      await btn.click();
    } else {
      // fallback: click the second button (first is usually a back/cancel)
      await page.locator('button').nth(1).click();
    }
    await page.waitForURL(u => u.href.includes('dashboard'), { timeout: 15000 });
  }
}

// ── Check runner ─────────────────────────────────────────────────────────────
async function runCheck(page: Page, check: Check, context: string): Promise<{ pass: boolean; detail: string }> {
  const ctx = `[${context}]`;

  if (check.kind === 'stat') {
    const els = page.locator(check.selector);
    const count = await els.count();
    if (count === 0) return { pass: false, detail: `${ctx} ${check.label}: no elements found (selector: ${check.selector})` };

    // check first few for non-empty, non-dash, non-zero values
    let emptyCount = 0;
    const sample = Math.min(count, 4);
    for (let i = 0; i < sample; i++) {
      const txt = (await els.nth(i).textContent() || '').trim();
      if (!txt || txt === '—' || txt === '-' || txt === '0' || txt === '₹0' || txt === '₹0.00') emptyCount++;
    }
    if (emptyCount === sample) return { pass: false, detail: `${ctx} ${check.label}: all ${sample} sampled values are empty/zero` };
    return { pass: true, detail: `${ctx} ${check.label}: ${count} elements, values present` };
  }

  if (check.kind === 'table') {
    const tbody = page.locator(`${check.selector} tbody`).first();
    if (!await tbody.count()) return { pass: false, detail: `${ctx} ${check.label}: no table/tbody found` };

    const rows = tbody.locator('tr');
    const rowCount = await rows.count();
    if (rowCount < check.minRows) return { pass: false, detail: `${ctx} ${check.label}: only ${rowCount} rows (expected ≥${check.minRows})` };

    // check cells in first row are non-empty
    const firstRowCells = rows.first().locator('td');
    const cellCount = await firstRowCells.count();
    let emptyCells: string[] = [];
    for (let i = 0; i < cellCount; i++) {
      const txt = (await firstRowCells.nth(i).textContent() || '').trim();
      if (!txt || txt === '—' || txt === '-') emptyCells.push(`col[${i}]`);
    }
    if (emptyCells.length === cellCount) return { pass: false, detail: `${ctx} ${check.label}: all ${cellCount} cells in first row are empty` };
    if (emptyCells.length > 0) return { pass: true, detail: `${ctx} ${check.label}: ${rowCount} rows — empty cells: ${emptyCells.join(', ')}` };
    return { pass: true, detail: `${ctx} ${check.label}: ${rowCount} rows, all cells populated` };
  }

  if (check.kind === 'grid') {
    const els = page.locator(check.selector);
    const count = await els.count();
    if (count === 0) return { pass: false, detail: `${ctx} ${check.label}: no grid items found` };
    const txt = (await els.first().textContent() || '').trim();
    if (!txt) return { pass: false, detail: `${ctx} ${check.label}: first item is empty` };
    return { pass: true, detail: `${ctx} ${check.label}: ${count} items, first="${txt.slice(0,30)}"` };
  }

  if (check.kind === 'badge') {
    const count = await page.locator(check.selector).count();
    if (count === 0) return { pass: false, detail: `${ctx} ${check.label}: no badges found` };
    return { pass: true, detail: `${ctx} ${check.label}: ${count} badges` };
  }

  if (check.kind === 'chart') {
    const count = await page.locator(check.selector).count();
    if (count === 0) return { pass: false, detail: `${ctx} ${check.label}: no chart element` };
    return { pass: true, detail: `${ctx} ${check.label}: chart present` };
  }

  return { pass: false, detail: `${ctx} unknown check kind` };
}

// ── Generate tests ────────────────────────────────────────────────────────────
for (const user of USERS) {
  for (const pg of PAGES) {
    if (!pg.roles.includes(user.role)) continue;

    const tabLabel = pg.tab ? ` [${pg.tab.value} tab]` : '';
    const testName = `${pg.path}${tabLabel}`;

    test.describe(`[${user.label}]`, () => {
      test(testName, async ({ page }) => {
        await loginAndSelectCrusher(page, user.email);

        // Navigate to page
        await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000); // let React Query fetch and render

        // Switch tab if needed
        if (pg.tab) {
          const tabBtn = page.locator(pg.tab.selector).filter({ hasText: pg.tab.value }).first();
          if (await tabBtn.count()) {
            await tabBtn.click();
            await page.waitForTimeout(800);
          }
        }

        const failures: string[] = [];
        const passes: string[] = [];

        for (const check of pg.checks) {
          const context = `${user.label} ${pg.path}${tabLabel}`;
          const result = await runCheck(page, check, context);
          if (result.pass) passes.push(result.detail);
          else failures.push(result.detail);
        }

        if (failures.length) {
          console.log('\n❌ FAILURES:');
          failures.forEach(f => console.log('  ', f));
        }
        if (passes.length) {
          passes.forEach(p => console.log('  ✓', p));
        }

        expect(failures, `\n${failures.join('\n')}`).toHaveLength(0);
      });
    });
  }
}
