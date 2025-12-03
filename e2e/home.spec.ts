import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fushuma/);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for main navigation elements
    const governanceLink = page.getByRole('link', { name: /governance/i });
    await expect(governanceLink).toBeVisible();

    const defiLink = page.getByRole('link', { name: /defi|swap/i });
    await expect(defiLink).toBeVisible();
  });

  test('should navigate to governance page', async ({ page }) => {
    await page.goto('/');

    const governanceLink = page.getByRole('link', { name: /governance/i }).first();
    await governanceLink.click();

    await expect(page).toHaveURL(/governance/);
    await expect(page.getByText('Governance Proposals')).toBeVisible();
  });
});

test.describe('Governance Page', () => {
  test('should load the governance page', async ({ page }) => {
    await page.goto('/governance');

    await expect(page.getByText('Governance Proposals')).toBeVisible();
    await expect(page.getByText('Vote on proposals')).toBeVisible();
  });

  test('should have status filter buttons', async ({ page }) => {
    await page.goto('/governance');

    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible();
  });

  test('should show wallet connection prompt', async ({ page }) => {
    await page.goto('/governance');

    // Should show connect wallet message when not connected
    const connectMessage = page.getByText(/connect your wallet/i);
    await expect(connectMessage).toBeVisible();
  });

  test('should have create proposal button', async ({ page }) => {
    await page.goto('/governance');

    const createButton = page.getByRole('button', { name: /create proposal/i });
    await expect(createButton).toBeVisible();
    // Button should be disabled when not connected
    await expect(createButton).toBeDisabled();
  });
});

test.describe('DeFi Pages', () => {
  test('should load the swap page', async ({ page }) => {
    await page.goto('/defi/fumaswap/swap');

    await expect(page.getByText(/swap/i)).toBeVisible();
  });

  test('should load the pools page', async ({ page }) => {
    await page.goto('/defi/fumaswap/pools');

    await expect(page.getByText(/liquidity pools/i)).toBeVisible();
  });

  test('should load the liquidity page', async ({ page }) => {
    await page.goto('/defi/fumaswap/liquidity');

    await expect(page.getByText(/liquidity/i)).toBeVisible();
  });
});

test.describe('Grants Page', () => {
  test('should load the grants page', async ({ page }) => {
    await page.goto('/grants');

    await expect(page.getByText(/grants/i)).toBeVisible();
  });
});

test.describe('Launchpad Page', () => {
  test('should load the launchpad page', async ({ page }) => {
    await page.goto('/launchpad');

    await expect(page.getByText(/launchpad/i)).toBeVisible();
  });
});

test.describe('Community Page', () => {
  test('should load the community page', async ({ page }) => {
    await page.goto('/community');

    await expect(page.getByText(/community/i)).toBeVisible();
  });
});

test.describe('Documentation Pages', () => {
  test('should load the docs page', async ({ page }) => {
    await page.goto('/docs');

    await expect(page.getByText(/documentation/i)).toBeVisible();
  });

  test('should load the getting started page', async ({ page }) => {
    await page.goto('/docs/getting-started');

    await expect(page.getByText(/getting started/i)).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('/');

    // Page should still load and be functional
    await expect(page).toHaveTitle(/Fushuma/);
  });

  test('governance page should work on mobile', async ({ page }) => {
    await page.goto('/governance');

    await expect(page.getByText('Governance Proposals')).toBeVisible();
  });
});
