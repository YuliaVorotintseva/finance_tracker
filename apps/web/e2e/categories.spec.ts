import { test, expect } from "@playwright/test";

test.describe("Categories", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("should create new category", async ({ page }) => {
    await page.goto("/categories");

    await page.click("text=Добавить категорию");
    await page.fill("#name", "Тестовая категория");
    await page.click("text=Сохранить");

    await expect(page.getByText("Тестовая категория")).toBeVisible();
  });

  test("should delete category", async ({ page }) => {
    await page.goto("/categories");

    const categoryName = `ToDelete-${Date.now()}`;
    await page.click("text=Добавить категорию");
    await page.fill("#name", categoryName);
    await page.click("text=Сохранить");

    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 5000 });

    await page
      .locator(`text=${categoryName}`)
      .locator('xpath=ancestor::div[contains(@class, "card")]//button')
      .click();

    await expect(page.getByText(categoryName)).not.toBeVisible({
      timeout: 5000,
    });
  });
});
