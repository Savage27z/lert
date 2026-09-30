import { expect, test } from "@playwright/test";

test("homepage shows real products and no staff links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Authentic African groceries");
  await expect(page.getByRole("complementary", { name: "On the shelf today" })).toContainText("$");
  const html = await page.content();
  expect(html).not.toMatch(/store-operations|admin/i);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("search tolerates case and typos", async ({ page }) => {
  await page.goto("/shop?q=peek%20milk");
  await expect(page.getByRole("link", { name: "Peak Liquid" })).toBeVisible();
  await page.goto("/shop?q=MILO");
  await expect(page.getByRole("link", { name: "Milo", exact: true })).toBeVisible();
  await page.goto("/shop?q=zzzzqqq");
  await expect(page.getByRole("heading", { name: "No products found" })).toBeVisible();
});

test("variant selection, add to cart, server-priced totals", async ({ page }) => {
  await page.goto("/product/honey-beans");
  await page.getByText("10 lbs").click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(drawer).toContainText("Honey Beans");
  await expect(drawer).toContainText("10 lbs");
  await expect(drawer).toContainText("$45.98");

  await page.goto("/cart");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByRole("region", { name: "Order summary" })).toContainText("$68.97");
  // Checkout is honestly unavailable until payments are configured.
  await expect(page.getByRole("button", { name: "Checkout" })).toBeDisabled();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

test("forged cart data cannot change prices", async ({ page }) => {
  await page.goto("/product/milo");
  await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem("adisah.cart.v1") ?? "[]");
    localStorage.setItem("adisah.cart.v1", JSON.stringify(items.map((i: object) => ({ ...i, unit_price_cents: 1, price: 0.01 }))));
  });
  await page.goto("/cart");
  await expect(page.getByRole("region", { name: "Order summary" })).not.toContainText("$0.01");
  await page.getByRole("button", { name: "Remove" }).click();
});

test("sold-out, variable-price item cannot be added", async ({ page }) => {
  await page.goto("/product/goat-meat");
  await expect(page.getByRole("button", { name: "Not available online" })).toBeDisabled();
});

test("hidden products are not reachable", async ({ page }) => {
  const res = await page.goto("/product/gari-ijebu");
  expect(res?.status()).toBe(404);
});
