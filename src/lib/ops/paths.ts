// Base path of the private Store Operations app. It is never linked from the
// storefront. Obscurity is NOT the protection: every route behind it requires
// an authenticated, MFA-verified, active staff account (enforced server-side
// and again by database RLS).
export const OPS_BASE_PATH = "/store-operations";

export const opsPath = (sub = "") => `${OPS_BASE_PATH}${sub}`;
