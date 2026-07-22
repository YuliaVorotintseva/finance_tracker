import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading")).toContainText("Finance Tracker");
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("should register new user", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    await page.fill("#name", "Test User");
    await page.fill("#email", `test-${timestamp}@example.com`);
    await page.fill("#password", "Password123!");
    await page.fill("#confirmPassword", "Password123!");

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should show validation errors", async ({ page }) => {
    await page.goto("/register");

    await page.fill("#name", "a");

    await page.fill("#name", "");

    await page.click("#email");

    await expect(page.getByText(/at least 2 characters/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
