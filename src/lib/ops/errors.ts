import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

const NOT_ALLOWED_MESSAGE = "You don't have permission to do that.";
export const NOT_ALLOWED = { ok: false, error: NOT_ALLOWED_MESSAGE } as const;

/** Maps database errors to messages that help staff without leaking internals. */
export function dbError(context: string, error: PostgrestError): ActionResult<never> {
  console.error(`[ops] ${context}:`, error.code, error.message);
  switch (error.code) {
    case "42501":
      // Guard triggers raise readable, intentional messages with this code.
      return { ok: false, error: error.message.startsWith("permission denied") ? NOT_ALLOWED_MESSAGE : error.message };
    case "23505":
      if (error.message.includes("sku")) return { ok: false, error: "That SKU is already used by another variant." };
      if (error.message.includes("slug")) return { ok: false, error: "That URL name is already used by another product." };
      return { ok: false, error: "That value is already in use." };
    case "23514":
      return { ok: false, error: "One of the values isn't allowed (for example, a negative stock quantity)." };
    case "22023":
      return { ok: false, error: error.message };
    default:
      return { ok: false, error: "Something went wrong while saving. Please try again." };
  }
}
