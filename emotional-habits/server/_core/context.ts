import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import * as db from "../db";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[Auth] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    console.log("[Auth] Request received, auth header:", authHeader ? "present" : "absent");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
        if (error) {
          console.error("[Auth] JWT verification failed:", error.message);
        } else if (supabaseUser) {
          user = await db.getUserByOpenId(supabaseUser.id) ?? null;
          if (!user) {
            await db.upsertUser({
              openId: supabaseUser.id,
              email: supabaseUser.email ?? null,
              name: supabaseUser.user_metadata?.name ?? supabaseUser.email ?? null,
              loginMethod: "email",
              lastSignedIn: new Date(),
            });
            user = await db.getUserByOpenId(supabaseUser.id) ?? null;
          }
        }
      }
    }
  } catch (error) {
    console.error("[Auth] Context creation error:", error);
    user = null;
  }

  return { req: opts.req, res: opts.res, user };
}
