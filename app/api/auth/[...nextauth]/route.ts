// =============================================================================
//  AUTH ROUTE  —  lives at "/api/auth/..."
// =============================================================================
//  Auth.js needs a catch-all route to handle sign-in, sign-out, the magic-link
//  callback, etc. We just re-export the handlers from our auth config.
// =============================================================================

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
