# ADISAH African Store — Architecture

## 1. Starting point

The repository was empty: no code, assets, or history. The supplied composite image (storefront,
shop, product page, admin dashboard, admin login) is design direction only. The prices, stock
counts, ratings and order rows in it are mockup data, and none of it is reused. The product list
in the brief, taken from the ADISAH POS screenshots, is treated as the real source catalog (see
`docs/CATALOG-REVIEW.md`). The POS screenshots themselves were not attached. Only the brief's
transcription of them was available.

## 2. Stack and why

| Concern | Choice | Why |
|---|---|---|
| Web app | **Next.js 16 (App Router) + TypeScript** | Server rendering for SEO and speed. Server actions give one codebase for storefront and operations. Route groups allow two fully separate root layouts on one domain. |
| Database | **Supabase Postgres** | Relational data (variants, orders, snapshots). Row Level Security lets authorization live **in the database**. The owner already knows Supabase. |
| Auth | **Supabase Auth** (email + password, TOTP MFA) | One identity system for customers and staff. Staff privileges come only from database rows, never from user-editable metadata. |
| Images | **Supabase Storage** bucket `product-images` | Public CDN reads. Uploads are limited by storage policy to `catalog.write`. |
| Styling | Tailwind CSS 4 + custom tokens | Custom design language; no component-library look. |
| Payments (next phase) | **Stripe** (Payment Element + webhooks) proposed | Hosted card fields keep PCI scope minimal. Wallets (Apple Pay etc.) only appear if enabled in Stripe. Final choice is the owner's. |
| Hosting | Vercel (proposed) + Supabase | Zero-ops for a small business; the domain `adisahstore.com` points to Vercel. |

Tradeoff noted: storefront pages render per request (`force-dynamic`) so a price change in
Store Operations is visible at once with no redeploy. The catalog functions are fast indexed
queries, which is fine at hundreds to low thousands of products. If traffic grows, add
`cacheComponents` + `cacheTag`, and call `updateTag` from the admin actions.

## 3. One domain, two applications

```
adisahstore.com/                      Storefront      src/app/(store)/…     root layout #1
adisahstore.com/store-operations/…    Operations      src/app/store-operations/…  root layout #2
```

- Separate **root layouts**: different HTML shells, CSS bundles and JS chunks. No storefront page
  imports operations code, and nothing on the storefront links to the operations path.
- The path is one constant (`src/lib/ops/paths.ts`, plus the folder name). Renaming it is safe.
  **It is not a security control.**

## 4. Security model

```
request → proxy.ts (refresh session, noindex + no-store headers on the ops path)
        → Store Operations layout: requireStaff()
              getUser()  (re-validated with the auth server)
              rpc staff_context()  → active staff row? role? MFA (aal2)?
              otherwise → plain 404 (identical to any unknown URL)
        → page: requireStaff("<permission>")
        → server action: staffForAction("<permission>")
        → database: RLS policies + guard triggers  ← the real enforcement
```

- **Anonymous visitors have no table access at all.** The storefront calls only
  `storefront_*` SECURITY DEFINER functions. They return published products and
  customer-safe fields only: no POS names, internal notes or exact stock counts.
- **Staff rights** = `staff_members` row (active) → `staff_roles` → `role_permissions`.
  `private.has_permission()` also requires an **MFA-verified session** (`aal2`) for every staff role.
- **Column-level guards** (triggers): prices need `pricing.write`, stock needs `inventory.write`,
  other product fields need `catalog.write`. Order money, items and payment status can't be edited
  by any end user. Cancellation must go through the (future) payment-aware workflow.
- **No self-escalation:** nobody may edit their own membership. Non-owners can't grant or edit a
  role at or above their own rank. Staff are deactivated, never deleted.
- **No public admin sign-up.** The first owner is granted with `scripts/bootstrap-owner.mjs`
  (service key, run locally). Customers who try the staff sign-in are signed out with a generic error.
- **Audit log** is written only by database triggers. It is append-only, and no role can
  insert or edit it directly.
- **Browser data is never trusted:** the cart stores only variant ids and quantities.
  `storefront_price_cart` re-prices everything, clamps quantities, and respects tracked stock.
- Headers: CSP, `frame-ancestors 'none'`, nosniff, strict referrer, HSTS (prod), and
  `X-Robots-Tag: noindex` + `Cache-Control: no-store` on the ops path. `robots.txt` deliberately
  does **not** mention the ops path; the sitemap only lists public pages.
- CSRF: server actions are POST-only with Next.js origin checks. Supabase calls use bearer tokens.
- Secrets: only the anon key is public (safe under RLS). The service-role key is used solely by
  the bootstrap script and, later, payment webhooks. It's in `.env.local`, which is gitignored.

Recommended project settings before launch: enable **CAPTCHA** (Turnstile/hCaptcha) for Supabase
Auth; set **session time-box / inactivity timeout**; tighten auth rate limits; turn on
**leaked-password protection**; restrict redirect URLs to the production domain.

## 5. Data model (Postgres, money in integer cents)

- `categories`, `brands`
- `products`: customer `name` + untouched POS `source_name`, slug, descriptions, `status`
  (draft/active/archived), `visibility` (published/hidden), `pricing_type` (fixed/variable),
  `is_featured`, `search_keywords`, `needs_review` + `review_notes`, trigger-maintained `search_text`
  (trigram index)
- `product_variants`: name, SKU (unique, case-insensitive), `regular_price_cents` (nullable while
  unknown or variable), `track_inventory` + `stock_quantity` + `low_stock_threshold` or a manual
  status, generated `stock_status`, `online_enabled`, pickup/delivery/shipping flags
- `product_images` (ordered, alt text)
- `promotions` + `promotion_items`: sale prices with start/end. The **regular price is never
  overwritten**. Effective price = lowest active promo price below regular.
- `price_history` (trigger), `audit_log` (trigger)
- `orders` + `order_items`: **snapshots** of name, variant, SKU, regular and paid unit price,
  quantity, discount, tax and line total. `order_status_history` and internal `order_notes`
  are kept alongside.
- `profiles`, `addresses`, `wishlist_items` (customer-owned via RLS), `newsletter_subscribers`
- `store_settings` (key/value; unknown facts stay `NULL`; tax is `not_configured`)
- `staff_roles`, `permissions`, `role_permissions`, `staff_members`

Variable-price items (goat meat, mackerel, whitening fish) are modeled as
`pricing_type = 'variable'` and cannot be bought online. `price_unit` is reserved for
per-weight pricing once that workflow is decided.

## 6. Delivery phases

| Phase | Status |
|---|---|
| 1 Inspection | Done |
| 2 Architecture | This document |
| 3 Data | Done: migrations, seed from POS list, review flags |
| 4 Core storefront | Done: header, home, categories, shop + search/filters/sort, product page with variants, cart drawer + page, guest wishlist, about/contact, SEO, sitemap |
| 5 Admin foundation | Done: staff sign-in, TOTP MFA, authorization, dashboard, bulk product table with inline price/stock/online editing, product editor, variants, archive/restore, inventory, orders list, activity log |
| 6 Customer commerce | Next: customer accounts, checkout, Stripe, order creation (atomic, idempotent, stock-decrementing), confirmation, order history, synced wishlist |
| 7 Store operations | Promotions UI, order detail and fulfillment workflow, cancellations/refunds, customers, staff & roles UI, settings UI, reports, image upload UI |
| 8 Polish | Cross-browser/device QA, accessibility audit, performance, security review |

### Order creation plan (Phase 6)
1. Server action validates the cart and fulfillment choice, re-prices via DB, and computes tax
   through the configured provider (Stripe Tax or equivalent; **never a hard-coded 6%**).
2. A single `create_pending_order` SQL function inserts the order and snapshot items and
   **reserves stock** with `UPDATE … WHERE stock_quantity >= qty` in one transaction, keyed by an
   idempotency key.
3. Create a Stripe PaymentIntent for the DB-computed total with the order id in metadata.
4. The Stripe **webhook** (signature-verified, service role) marks the order paid, idempotently on
   the event id. Failed or expired payments release reservations.
5. The confirmation page reads the order from the DB. It never "assumes" success client-side.

## 7. Testing

- `npm run test:db`: SQL suite (`supabase/tests/security.test.sql`) that impersonates anon,
  customers, and each staff role. It covers RLS, column guards, MFA gating, escalation,
  price history, audit, promotions, order snapshots and cart re-pricing.
- `npm run test:e2e`: Playwright (desktop + mobile). It covers storefront flows, forged cart
  data, sold-out and hidden items, 404s for the ops path without staff, customer rejection at
  staff sign-in, and owner MFA → price change → live on storefront → audit and price history.
