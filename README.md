# ADISAH African Store

Online store for ADISAH African Store (adisahstore.com). It combines a public storefront with a
private **Store Operations** app on the same domain, backed by Supabase.

- Architecture, security model, data model, roadmap: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Catalog items needing owner input: [`docs/CATALOG-REVIEW.md`](docs/CATALOG-REVIEW.md)

## Local development

Requirements: Node 20+, Docker (for the Supabase CLI).

```bash
npm install
npx supabase start            # local Postgres/Auth/Storage; applies migrations + seed
cp .env.example .env.local    # paste the API URL, anon key and service_role key it printed
npm run dev                   # http://localhost:3000
```

### Create the first owner (there is no public admin sign-up)
1. Create a user in Supabase Studio (Authentication → Users), with email + password.
2. `npm run bootstrap:owner -- owner@example.com "Owner Name"`
3. Go to `/store-operations` (not linked anywhere), sign in, and enroll an authenticator app.

Further staff are added from Store Operations (Staff & roles is on the roadmap). Until then,
insert into `staff_members` via SQL with the role `inventory`, `manager`, `admin` or `owner`.

## Checks

```bash
npm run lint && npm run typecheck && npm run build
npm run test:db     # database security suite (DATABASE_URL, defaults to local Supabase)
npm run test:e2e    # Playwright; needs the app running on :3000. For the staff tests set
                    # E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD (and E2E_OWNER_TOTP_SECRET once enrolled),
                    # E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD
```

## Deploying
- Create a Supabase project and run `npx supabase db push` (migrations). Run `supabase/seed.sql`
  once for the initial catalog.
- Deploy to Vercel with `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is only needed for scripts and
  (later) payment webhooks. Never prefix it with `NEXT_PUBLIC_`.
- In Supabase Auth: set the site URL and redirect URLs to the production domain, enable CAPTCHA,
  and enable leaked-password protection and session limits.
