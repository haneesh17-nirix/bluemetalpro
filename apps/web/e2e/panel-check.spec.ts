/**
 * Panel data validation — logs in as each role and checks every accessible
 * page renders data (no empty states, no error banners, no spinners stuck).
 *
 * Run against production:
 *   BASE_URL=https://www.bluemetalpro.in npx playwright test e2e/panel-check.spec.ts --reporter=list
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://www.bluemetalpro.in';
const API  = process.env.API_URL  || 'https://api.bluemetalpro.in';

// ── Test accounts ────────────────────────────────────────────────────────────
const USERS = [
  { label: 'admin',         email: 'admin@bluemetal.local',    password: 'Test@1234', role: 'admin' },
  { label: 'operations',    email: 'operator1@bluemetal.local', password: 'Test@1234', role: 'operations' },
  { label: 'report_viewer', email: 'reports@bluemetal.local',  password: 'Test@1234', role: 'report_viewer' },
];

// ── Pages each role should see with data ────────────────────────────────────
const PAGES_BY_ROLE: Record<string, { path: string; dataSelector: string; label: string }[]> = {
  admin: [
    { path: '/dashboard',   dataSelector: '[data-testid="stat-card"], .stat-value, h2 ~ div',    label: 'Dashboard stats' },
    { path: '/sales',       dataSelector: 'table tbody tr, [data-testid="sale-row"]',              label: 'Sales rows' },
    { path: '/purchases',   dataSelector: 'table tbody tr, [data-testid="purchase-row"]',          label: 'Purchases rows' },
    { path: '/quarry',      dataSelector: 'table tbody tr, [data-testid="quarry-row"]',            label: 'Quarry rows' },
    { path: '/parties',     dataSelector: 'table tbody tr, [data-testid="party-row"]',             label: 'Parties rows' },
    { path: '/vehicles',    dataSelector: 'table tbody tr, [data-testid="vehicle-row"]',           label: 'Vehicles rows' },
    { path: '/ledger',      dataSelector: 'table tbody tr, [data-testid="ledger-row"]',            label: 'Ledger rows' },
    { path: '/maintenance', dataSelector: 'table tbody tr, [data-testid="maintenance-row"]',       label: 'Maintenance rows' },
    { path: '/wages',       dataSelector: 'table tbody tr, [data-testid="worker-row"]',            label: 'Wages workers' },
    { path: '/reports',     dataSelector: 'canvas, svg, table tbody tr, [data-testid="report"]',  label: 'Reports content' },
  ],
  operations: [
    { path: '/dashboard',   dataSelector: '[data-testid="stat-card"], .stat-value, h2 ~ div',    label: 'Dashboard stats' },
    { path: '/sales',       dataSelector: 'table tbody tr, [data-testid="sale-row"]',              label: 'Sales rows' },
    { path: '/purchases',   dataSelector: 'table tbody tr, [data-testid="purchase-row"]',          label: 'Purchases rows' },
    { path: '/quarry',      dataSelector: 'table tbody tr, [data-testid="quarry-row"]',            label: 'Quarry rows' },
    { path: '/parties',     dataSelector: 'table tbody tr, [data-testid="party-row"]',             label: 'Parties rows' },
    { path: '/vehicles',    dataSelector: 'table tbody tr, [data-testid="vehicle-row"]',           label: 'Vehicles rows' },
    { path: '/ledger',      dataSelector: 'table tbody tr, [data-testid="ledger-row"]',            label: 'Ledger rows' },
    { path: '/maintenance', dataSelector: 'table tbody tr, [data-testid="maintenance-row"]',       label: 'Maintenance rows' },
    { path: '/wages',       dataSelector: 'table tbody tr, [data-testid="worker-row"]',            label: 'Wages workers' },
  ],
  report_viewer: [
    { path: '/dashboard',   dataSelector: '[data-testid="stat-card"], .stat-value, h2 ~ div',    label: 'Dashboard stats' },
    { path: '/sales',       dataSelector: 'table tbody tr, [data-testid="sale-row"]',              label: 'Sales rows' },
    { path: '/purchases',   dataSelector: 'table tbody tr, [data-testid="purchase-row"]',          label: 'Purchases rows' },
    { path: '/quarry',      dataSelector: 'table tbody tr, [data-testid="quarry-row"]',            label: 'Quarry rows' },
    { path: '/ledger',      dataSelector: 'table tbody tr, [data-testid="ledger-row"]',            label: 'Ledger rows' },
    { path: '/reports',     dataSelector: 'canvas, svg, table tbody tr, [data-testid="report"]',  label: 'Reports content' },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginAndSelectCrusher(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for crusher selection screen or direct redirect
  await page.waitForURL(/select-crusher|dashboard|platform/, { timeout: 15000 });

  if (page.url().includes('select-crusher')) {
    // Pick first crusher
    await page.waitForSelector('button, [data-testid="crusher-option"]', { timeout: 10000 });
    const crusherBtn = page.locator('button').filter({ hasText: /unit|quarry|bluemetal/i }).first();
    if (await crusherBtn.count() > 0) {
      await crusherBtn.click();
    } else {
      await page.locator('button').nth(1).click();
    }
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  }
}

async function checkPageForData(page: Page, path: string, dataSelector: string): Promise<{ found: boolean; detail: string }> {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');

  // Wait up to 8 seconds for data
  try {
    await page.waitForSelector(dataSelector, { timeout: 8000 });
    const count = await page.locator(dataSelector).count();
    return { found: count > 0, detail: `${count} element(s) matched` };
  } catch {
    // Check for explicit error messages
    const errorText = await page.locator('text=/error|failed|something went wrong/i').count();
    const emptyText = await page.locator('text=/no data|no records|empty|nothing/i').count();
    if (errorText > 0) return { found: false, detail: 'Error message visible on page' };
    if (emptyText > 0) return { found: false, detail: 'Empty state shown — no seeded data visible' };
    return { found: false, detail: 'Selector not found within 8s (possible loading issue)' };
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

for (const user of USERS) {
  test.describe(`[${user.label}] ${user.email}`, () => {

    test(`login with Test@1234`, async ({ page }) => {
      await loginAndSelectCrusher(page, user.email, user.password);
      expect(page.url()).toContain('dashboard');
    });

    const pages = PAGES_BY_ROLE[user.role] || [];
    for (const pg of pages) {
      test(`${pg.path} — ${pg.label}`, async ({ page }) => {
        await loginAndSelectCrusher(page, user.email, user.password);
        const result = await checkPageForData(page, pg.path, pg.dataSelector);
        expect(result.found, `${pg.path}: ${result.detail}`).toBe(true);
      });
    }
  });
}
