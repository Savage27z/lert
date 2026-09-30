#!/usr/bin/env node
// Grants the Owner role to an EXISTING account. This is the only way the first
// staff member is created: there is no public admin sign-up. Run it from a
// trusted machine with the service-role key; afterwards the owner manages
// staff from Store Operations.
//
//   node --env-file=.env.local scripts/bootstrap-owner.mjs owner@example.com ["Display Name"]
//
// The account must already exist (create it in the Supabase dashboard under
// Authentication -> Users, or sign up on the site). On first sign-in to Store
// Operations the owner is required to enroll an authenticator app.
import { createClient } from "@supabase/supabase-js";

const [email, displayName] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !url || !serviceKey) {
  console.error("Usage: node --env-file=.env.local scripts/bootstrap-owner.mjs <email> [display name]");
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let user = null;
for (let page = 1; !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No account found for ${email}. Create the user first, then re-run.`);
  process.exit(1);
}

const { error } = await admin
  .from("staff_members")
  .upsert({ user_id: user.id, role_key: "owner", display_name: displayName ?? null, is_active: true });
if (error) throw error;
console.log(`${email} is now an active Owner. Sign in at /store-operations to enroll MFA.`);
