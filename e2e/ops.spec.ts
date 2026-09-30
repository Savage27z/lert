import { expect, test } from "@playwright/test";
import { totp } from "./totp";

const OWNER = process.env.E2E_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD;
const CUSTOMER = process.env.E2E_CUSTOMER_EMAIL;
const CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD;
let totpSecret = process.env.E2E_OWNER_TOTP_SECRET;

test("portal pages are a plain 404 without a staff session", async ({ page }) => {
  for (const path of ["/store-operations/dashboard", "/store-operations/products", "/store-operations/activity"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText(/dashboard|staff|operations/i)).toHaveCount(0);
  }
});

test("storefront sitemap never lists the portal", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  expect(body).toContain("/product/");
  expect(body).not.toContain("store-operations");
  expect(await (await request.get("/robots.txt")).text()).not.toContain("store-operations");
});

test("customer accounts are rejected at staff sign-in", async ({ page }) => {
  test.skip(!CUSTOMER || !CUSTOMER_PASSWORD, "E2E_CUSTOMER_* not set");
  await page.goto("/store-operations");
  await page.getByLabel("Email").fill(CUSTOMER!);
  await page.getByLabel("Password").fill(CUSTOMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  expect((await page.goto("/store-operations/dashboard"))?.status()).toBe(404);
});

test("owner: MFA, price change goes live, history and audit recorded", async ({ page }) => {
  test.skip(!OWNER || !OWNER_PASSWORD, "E2E_OWNER_* not set");
  await page.goto("/store-operations");
  await page.getByLabel("Email").fill(OWNER!);
  await page.getByLabel("Password").fill(OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Two-step verification" })).toBeVisible();
  // Before MFA, portal pages are still closed.
  const denied = await page.request.get("/store-operations/dashboard");
  expect(denied.url()).toContain("/store-operations/verify");

  if (await page.getByAltText("Authenticator setup QR code").isVisible()) {
    await page.getByText("Can't scan? Enter this key instead").click();
    totpSecret = (await page.locator("details code").innerText()).trim();
  }
  expect(totpSecret, "set E2E_OWNER_TOTP_SECRET for an already-enrolled owner").toBeTruthy();
  await page.getByLabel("Verification code").fill(totp(totpSecret!));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/store-operations\/dashboard/);
  await expect(page.getByRole("heading", { name: /Needs review/ })).toBeVisible();

  // Change Milo 400 g: $14.75 -> $15.49
  await page.goto("/store-operations/products?q=milo");
  await page.getByRole("button", { name: /Edit price for Milo — 400 g/ }).click();
  await page.getByLabel("New price for Milo — 400 g").fill("15.49");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: /Edit price for Milo — 400 g, currently \$15\.49/ })).toBeVisible();

  // Storefront reflects it immediately — no code change, no redeploy.
  await page.goto("/product/milo");
  await expect(page.locator(".price-tag").first()).toContainText("$15.49");

  // A large change asks for confirmation.
  await page.goto("/store-operations/products?q=milo");
  await page.getByRole("button", { name: /Edit price for Milo — 400 g/ }).click();
  await page.getByLabel("New price for Milo — 400 g").fill("30.00");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog", { name: "Confirm a large price change" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).last().click();
  await page.getByRole("button", { name: "Cancel" }).first().click();

  // Restore the original price.
  await page.getByRole("button", { name: /Edit price for Milo — 400 g/ }).click();
  await page.getByLabel("New price for Milo — 400 g").fill("14.75");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: /currently \$14\.75/ })).toBeVisible();

  await page.goto("/store-operations/activity");
  await expect(page.getByText("Changed Milo — 400 g price $14.75 → $15.49")).toBeVisible();
  await expect(page.getByText("Changed Milo — 400 g price $15.49 → $14.75")).toBeVisible();

  await page.goto("/store-operations/products?q=milo");
  await page.getByRole("link", { name: "Milo", exact: true }).click();
  await expect(page.getByRole("region", { name: "Price history" })).toContainText("$15.49");
});
