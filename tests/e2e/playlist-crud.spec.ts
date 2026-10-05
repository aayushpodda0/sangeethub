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

test("creates a playlist and adds a track to it", async ({ page }) => {
  const playlistName = `E2E Test Playlist ${Date.now()}`;

  await page.goto("/playlists");
  await page.getByRole("button", { name: /new playlist/i }).click();
  await page.getByLabel("Playlist name").fill(playlistName);
  await page.getByRole("button", { name: /^create playlist$/i }).click();

  // Creating redirects into the new playlist's detail page.
  await expect(page).toHaveURL(/\/playlists\/[a-zA-Z0-9]+$/);
  await expect(page.getByRole("heading", { name: playlistName })).toBeVisible();

  const addTrackInput = page.getByLabel("Search tracks to add to this playlist");
  await addTrackInput.fill("a");
  await page.waitForTimeout(500);

  const firstResult = page.getByRole("button", { name: /^Add .* to playlist$/i }).first();
  await expect(firstResult).toBeVisible({ timeout: 10000 });
  await firstResult.click();

  await expect(page.getByText(/track added/i)).toBeVisible();
});

test("shows an empty state for a brand new playlist before any tracks are added", async ({ page }) => {
  const playlistName = `Empty Playlist ${Date.now()}`;

  await page.goto("/playlists");
  await page.getByRole("button", { name: /new playlist/i }).click();
  await page.getByLabel("Playlist name").fill(playlistName);
  await page.getByRole("button", { name: /^create playlist$/i }).click();

  await expect(page).toHaveURL(/\/playlists\/[a-zA-Z0-9]+$/);
  await expect(page.getByText(/no tracks yet/i)).toBeVisible();
});
