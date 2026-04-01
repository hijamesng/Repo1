// api-entry.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { z as z2 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/db.ts
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var domainEnum = pgEnum("domain", ["Boss", "Colleague", "Customer"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var emotionalEntries = pgTable("emotional_entries", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  /** Professional domain context */
  domain: domainEnum("domain").notNull(),
  /** Communication goal for the interaction */
  goal: text("goal").notNull(),
  /** NVC-based intention set before the interaction */
  intention: text("intention").notNull(),
  /** The specific trigger point that activated the emotional response */
  trigger: text("trigger").notNull(),
  /** The emotion felt in response to the trigger */
  emotionFelt: varchar("emotionFelt", { length: 128 }).notNull(),
  /** The default behavioural response (fight/flee/freeze/fawn) */
  behaviour: text("behaviour").notNull(),
  /** The planned alternate response for next time */
  alternateResponse: text("alternateResponse").notNull(),
  /** Optional reflection notes */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createEmotionalEntry(entry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(emotionalEntries).values(entry).returning();
  return result;
}
async function getEmotionalEntriesByUser(userId, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(emotionalEntries).where(eq(emotionalEntries.userId, userId)).orderBy(desc(emotionalEntries.createdAt)).limit(limit).offset(offset);
}
async function getEmotionalEntryById(id, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(emotionalEntries).where(eq(emotionalEntries.id, id)).limit(1);
  const entry = result[0];
  if (!entry || entry.userId !== userId) return null;
  return entry;
}
async function deleteEmotionalEntry(id, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const entry = await getEmotionalEntryById(id, userId);
  if (!entry) throw new Error("Entry not found or unauthorized");
  await db.delete(emotionalEntries).where(eq(emotionalEntries.id, id));
  return true;
}
async function getEmotionalEntriesCountByUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(emotionalEntries).where(eq(emotionalEntries.userId, userId));
  return result.length;
}
async function getRecentEmotionalEntries(userId, limit = 5) {
  return getEmotionalEntriesByUser(userId, limit, 0);
}
async function updateEmotionalEntry(id, userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const entry = await getEmotionalEntryById(id, userId);
  if (!entry) throw new Error("Entry not found or unauthorized");
  const [result] = await db.update(emotionalEntries).set(data).where(eq(emotionalEntries.id, id)).returning();
  return result;
}
async function updateUserName(id, name) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ name, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
}
async function updateUserRole(id, role) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function updateUserAvatar(id, avatarUrl) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ avatarUrl, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function deleteUserById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emotionalEntries).where(eq(emotionalEntries.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

// server/routers.ts
var domainEnum2 = z2.enum(["Boss", "Colleague", "Customer"]);
var emotionalEntryInput = z2.object({
  domain: domainEnum2,
  goal: z2.string().min(1, "Goal is required").max(500),
  intention: z2.string().min(1, "Intention is required").max(500),
  trigger: z2.string().min(1, "Trigger is required").max(500),
  emotionFelt: z2.string().min(1, "Emotion felt is required").max(128),
  behaviour: z2.string().min(1, "Behaviour is required").max(500),
  alternateResponse: z2.string().min(1, "Alternate response is required").max(500),
  notes: z2.string().max(1e3).optional()
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
        avatarUrl: ctx.user.avatarUrl ?? null
      };
    }),
    update: protectedProcedure.input(z2.object({ name: z2.string().min(1).max(100) })).mutation(async ({ ctx, input }) => {
      await updateUserName(ctx.user.id, input.name);
      return { success: true };
    }),
    updateAvatar: protectedProcedure.input(z2.object({ avatarUrl: z2.string().url().max(1e3) })).mutation(async ({ ctx, input }) => {
      await updateUserAvatar(ctx.user.id, input.avatarUrl);
      return { success: true };
    })
  }),
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return getAllUsers();
    }),
    updateRole: adminProcedure.input(z2.object({ userId: z2.number(), role: z2.enum(["user", "admin"]) })).mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
    deleteUser: adminProcedure.input(z2.object({ userId: z2.number() })).mutation(async ({ input }) => {
      await deleteUserById(input.userId);
      return { success: true };
    }),
    updateUser: adminProcedure.input(z2.object({ userId: z2.number(), name: z2.string().min(1).max(100) })).mutation(async ({ input }) => {
      await updateUserName(input.userId, input.name);
      return { success: true };
    })
  }),
  entries: router({
    /** Create a new emotional habit entry */
    create: protectedProcedure.input(emotionalEntryInput).mutation(async ({ ctx, input }) => {
      await createEmotionalEntry({
        userId: ctx.user.id,
        domain: input.domain,
        goal: input.goal,
        intention: input.intention,
        trigger: input.trigger,
        emotionFelt: input.emotionFelt,
        behaviour: input.behaviour,
        alternateResponse: input.alternateResponse,
        notes: input.notes ?? null
      });
      return { success: true };
    }),
    /** List all entries for the current user (paginated) */
    list: protectedProcedure.input(z2.object({ limit: z2.number().min(1).max(100).default(50), offset: z2.number().min(0).default(0) })).query(async ({ ctx, input }) => {
      const entries = await getEmotionalEntriesByUser(ctx.user.id, input.limit, input.offset);
      const total = await getEmotionalEntriesCountByUser(ctx.user.id);
      return { entries, total };
    }),
    /** Get recent entries for dashboard */
    recent: protectedProcedure.input(z2.object({ limit: z2.number().min(1).max(10).default(5) })).query(async ({ ctx, input }) => {
      return getRecentEmotionalEntries(ctx.user.id, input.limit);
    }),
    /** Get a single entry by ID */
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const entry = await getEmotionalEntryById(input.id, ctx.user.id);
      if (!entry) throw new Error("Entry not found");
      return entry;
    }),
    /** Update an existing entry */
    update: protectedProcedure.input(z2.object({ id: z2.number() }).merge(emotionalEntryInput)).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateEmotionalEntry(id, ctx.user.id, {
        domain: data.domain,
        goal: data.goal,
        intention: data.intention,
        trigger: data.trigger,
        emotionFelt: data.emotionFelt,
        behaviour: data.behaviour,
        alternateResponse: data.alternateResponse,
        notes: data.notes ?? null
      });
      return { success: true };
    }),
    /** Delete an entry */
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteEmotionalEntry(input.id, ctx.user.id);
      return { success: true };
    }),
    /** Get stats for dashboard */
    stats: protectedProcedure.query(async ({ ctx }) => {
      const entries = await getEmotionalEntriesByUser(ctx.user.id, 1e3, 0);
      const total = entries.length;
      const domainCounts = { Boss: 0, Colleague: 0, Customer: 0 };
      entries.forEach((e) => {
        domainCounts[e.domain]++;
      });
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      const daySet = new Set(entries.map((e) => {
        const d = new Date(e.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }));
      for (let i = 0; i < 365; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        if (daySet.has(day.getTime())) streak++;
        else break;
      }
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const thisWeek = entries.filter((e) => new Date(e.createdAt) >= weekStart).length;
      return { total, streak, thisWeek, domainCounts };
    })
  })
});

// server/_core/context.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[Auth] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function createContext(opts) {
  let user = null;
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
          user = await getUserByOpenId(supabaseUser.id) ?? null;
          if (!user) {
            await upsertUser({
              openId: supabaseUser.id,
              email: supabaseUser.email ?? null,
              name: supabaseUser.user_metadata?.name ?? supabaseUser.email ?? null,
              loginMethod: "email",
              lastSignedIn: /* @__PURE__ */ new Date()
            });
            user = await getUserByOpenId(supabaseUser.id) ?? null;
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

// api-entry.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var api_entry_default = app;
export {
  api_entry_default as default
};
