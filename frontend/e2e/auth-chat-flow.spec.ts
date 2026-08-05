import { test, expect } from "@playwright/test";

test.describe("Portal Ingest and Conversations Flow", () => {
  test("should successfully login, inspect dashboard, navigate to chat workspace, and sign out", async ({ page }) => {
    // 1. Visit Login Page
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Sign in to RagCX");

    // 2. Submit form with validated dev credentials
    await page.fill('input[type="email"]', "sarah.j@enterprise.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // 3. Verify successful redirection to Dashboard
    await page.waitForURL("/");
    await expect(page.locator("h1")).toContainText("System Operations Dashboard");

    // 4. Verify system indicators
    await expect(page.locator("text=AI Service Online")).toBeVisible();
    await expect(page.locator("text=Vector Database Ready")).toBeVisible();

    // 5. Navigate to AI chat via sidebar
    await page.click('button:has-text("AI Document Chat")');
    await page.waitForURL("/chat");
    await expect(page.locator("h2")).toContainText("AI Grounded Assistant");

    // 6. Create a new conversation thread
    await page.click('button:has-text("New Conversation")');
    await expect(page.locator("textarea")).toBeVisible();

    // 7. Input and send a prompt question
    await page.fill("textarea", "What are the ventilation standards?");
    await page.click('button[aria-label="Transmit Prompt"]');

    // 8. Verify typing indicator shows and assistant replies with citation panel
    await expect(page.locator("text=AI Ingestion Assistant is thinking...")).toBeVisible();
    await page.waitForSelector("text=RAG Grounding & Sources");
    await expect(page.locator("text=Grounded confidence:")).toBeVisible();

    // 9. Logout from portal
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL("/login");
    await expect(page.locator("h2")).toContainText("Sign in to RagCX");
  });
});
