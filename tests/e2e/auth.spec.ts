import { expect, test } from "@playwright/test";

// Uses the demo listener account created by prisma/seed.ts.
const DEMO_EMAIL = "listener@sangeethub.local";
const DEMO_PASSWORD = "Listener@12345";

test("signs in with the demo account and reaches the home dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByText(/welcome back/i)).toBeVisible();
});

test("shows a validation error for an unknown account", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("nobody@sangeethub.local");
  await page.getByLabel("Password").fill("WrongPassword123");
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await expect(page).toHaveURL(/\/login/);
});

test("redirects an unauthenticated visitor away from a protected page", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});
