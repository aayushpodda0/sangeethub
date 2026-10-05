import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "listener@sangeethub.local";
const DEMO_PASSWORD = "Listener@12345";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/home/);
});

test("searches the catalog and plays a result from the persistent player", async ({ page }) => {
  await page.goto("/search");

  const searchInput = page.getByLabel("Search music");
  await searchInput.fill("a");
  // Debounced search - give it a moment to settle and return results.
  await page.waitForTimeout(500);

  const results = page.getByLabel(/search results/i).getByRole("listitem");
  await expect(results.first()).toBeVisible({ timeout: 10000 });

  const firstTitle = await results.first().locator("p").first().innerText();
  await results.first().getByRole("button", { name: /^play/i }).click();

  // The persistent player bar should now show the same track and be playing.
  const playerBar = page.getByRole("region", { name: /now playing/i });
  await expect(playerBar).toBeVisible();
  await expect(playerBar.getByText(firstTitle)).toBeVisible();
  await expect(playerBar.getByRole("button", { name: /^pause/i })).toBeVisible();
});

test("shows a no-results state for a nonsense query", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Search music").fill("zzzzzznonexistenttrackzzzzzz");
  await page.waitForTimeout(500);

  await expect(page.getByText(/no results for/i)).toBeVisible({ timeout: 10000 });
});
