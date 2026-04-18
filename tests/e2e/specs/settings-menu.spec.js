// @ts-check
const { test, expect } = require('@playwright/test');

const TEST_SESSION_ID = 'TEST-JAR-1234';

test.beforeEach(async ({ page }) => {
  // Seed localStorage so the onboarding overlay is skipped.
  await page.addInitScript((id) => {
    localStorage.setItem('swearjar:userId', id);
  }, TEST_SESSION_ID);

  // The frontend fetches /api/summary on load; stub it so tests don't depend on Azure Functions.
  await page.route('**/api/summary**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          userId: TEST_SESSION_ID,
          todayKey: '2026-04-18',
          todayCount: 0,
          lifetimeTotal: 0,
          calendarDays: {},
        },
      }),
    })
  );

  await page.goto('/');
  await expect(page.locator('#settings-btn')).toBeVisible();
});

test.describe('settings (gear) menu', () => {
  test('starts hidden with correct a11y state', async ({ page }) => {
    const menu = page.locator('#settings-menu');
    const button = page.locator('#settings-btn');

    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toHaveAttribute('role', 'menu');
  });

  test('opens smoothly when the gear is clicked', async ({ page }) => {
    const menu = page.locator('#settings-menu');
    const button = page.locator('#settings-btn');

    await button.click();

    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toHaveClass(/\bshow\b/);
    await expect(menu).toBeVisible();

    // Items fade/slide in — after the stagger settles, all three should be fully opaque.
    const items = page.locator('.settings-menu__item');
    await expect(items).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(items.nth(i)).toHaveCSS('opacity', '1');
    }

    // Inner wrapper should have measurable height once the grid row expands.
    const innerHeight = await page
      .locator('.settings-menu__inner')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(innerHeight).toBeGreaterThan(0);
  });

  test('closes when the gear is clicked again', async ({ page }) => {
    const menu = page.locator('#settings-menu');
    const button = page.locator('#settings-btn');

    await button.click();
    await expect(menu).toHaveClass(/\bshow\b/);

    await button.click();

    // .show is removed synchronously; `hidden` is re-applied after the transition.
    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
  });

  test('closes when Escape is pressed', async ({ page }) => {
    const button = page.locator('#settings-btn');
    const menu = page.locator('#settings-menu');

    await button.click();
    await expect(menu).toHaveClass(/\bshow\b/);

    await page.keyboard.press('Escape');

    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes when clicking outside the menu', async ({ page }) => {
    const button = page.locator('#settings-btn');
    const menu = page.locator('#settings-menu');

    await button.click();
    await expect(menu).toHaveClass(/\bshow\b/);

    // Click the app title — definitely outside the menu and the gear.
    await page.locator('.app-title').click();

    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(menu).toBeHidden();
  });

  test('gear rotates 90° while open (aria-expanded drives transform)', async ({ page }) => {
    const button = page.locator('#settings-btn');

    const closedTransform = await button.evaluate((el) => getComputedStyle(el).transform);

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    // Rotation transitions in ~220ms; poll until it differs from the closed state.
    await expect
      .poll(async () => button.evaluate((el) => getComputedStyle(el).transform), {
        timeout: 2000,
      })
      .not.toBe(closedTransform);

    // The 90° rotation matrix is (0, 1, -1, 0, 0, 0) — allow float jitter near 0.
    const openTransform = await button.evaluate((el) => getComputedStyle(el).transform);
    expect(openTransform).toContain('1, -1,');
  });

  test('clicking a menu item closes the menu', async ({ page }) => {
    const button = page.locator('#settings-btn');
    const menu = page.locator('#settings-menu');

    // Menu items invoke window.prompt — auto-dismiss any dialog so the test isn't blocked.
    page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

    await button.click();
    await expect(menu).toHaveClass(/\bshow\b/);

    await page.locator('#menu-change-goal').click();

    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('rapid toggle does not leave the menu in a stuck state', async ({ page }) => {
    const button = page.locator('#settings-btn');
    const menu = page.locator('#settings-menu');

    for (let i = 0; i < 5; i++) {
      await button.click();
    }

    // 5 clicks = open/close/open/close/open → ends open.
    await expect(menu).toHaveClass(/\bshow\b/);
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    await button.click();
    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(menu).toBeHidden();
  });

});

test.describe('settings menu with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('opens and closes without relying on transitions', async ({ page }) => {
    const button = page.locator('#settings-btn');
    const menu = page.locator('#settings-menu');

    await button.click();
    await expect(menu).toHaveClass(/\bshow\b/);
    await expect(menu).toBeVisible();

    await button.click();
    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(menu).toBeHidden();
  });
});
