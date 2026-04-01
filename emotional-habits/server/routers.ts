import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createEmotionalEntry,
  deleteEmotionalEntry,
  getEmotionalEntriesByUser,
  getEmotionalEntryById,
  getRecentEmotionalEntries,
  getEmotionalEntriesCountByUser,
  updateEmotionalEntry,
  updateUserName,
  updateUserAvatar,
  getAllUsers,
  updateUserRole,
  deleteUserById,
} from "./db";

const domainEnum = z.enum(["Boss", "Colleague", "Customer"]);

const emotionalEntryInput = z.object({
  domain: domainEnum,
  goal: z.string().min(1, "Goal is required").max(500),
  intention: z.string().min(1, "Intention is required").max(500),
  trigger: z.string().min(1, "Trigger is required").max(500),
  emotionFelt: z.string().min(1, "Emotion felt is required").max(128),
  behaviour: z.string().min(1, "Behaviour is required").max(500),
  alternateResponse: z.string().min(1, "Alternate response is required").max(500),
  notes: z.string().max(1000).optional(),
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
        avatarUrl: ctx.user.avatarUrl ?? null,
      };
    }),
    update: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserName(ctx.user.id, input.name);
        return { success: true };
      }),
    updateAvatar: protectedProcedure
      .input(z.object({ avatarUrl: z.string().url().max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserAvatar(ctx.user.id, input.avatarUrl);
        return { success: true };
      }),
  }),

  admin: router({
    listUsers: adminProcedure.query(async () => {
      return getAllUsers();
    }),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUserById(input.userId);
        return { success: true };
      }),
    updateUser: adminProcedure
      .input(z.object({ userId: z.number(), name: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        await updateUserName(input.userId, input.name);
        return { success: true };
      }),
  }),

  entries: router({
    /** Create a new emotional habit entry */
    create: protectedProcedure
      .input(emotionalEntryInput)
      .mutation(async ({ ctx, input }) => {
        await createEmotionalEntry({
          userId: ctx.user.id,
          domain: input.domain,
          goal: input.goal,
          intention: input.intention,
          trigger: input.trigger,
          emotionFelt: input.emotionFelt,
          behaviour: input.behaviour,
          alternateResponse: input.alternateResponse,
          notes: input.notes ?? null,
        });
        return { success: true };
      }),

    /** List all entries for the current user (paginated) */
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
      .query(async ({ ctx, input }) => {
        const entries = await getEmotionalEntriesByUser(ctx.user.id, input.limit, input.offset);
        const total = await getEmotionalEntriesCountByUser(ctx.user.id);
        return { entries, total };
      }),

    /** Get recent entries for dashboard */
    recent: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
      .query(async ({ ctx, input }) => {
        return getRecentEmotionalEntries(ctx.user.id, input.limit);
      }),

    /** Get a single entry by ID */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const entry = await getEmotionalEntryById(input.id, ctx.user.id);
        if (!entry) throw new Error("Entry not found");
        return entry;
      }),

    /** Update an existing entry */
    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(emotionalEntryInput))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateEmotionalEntry(id, ctx.user.id, {
          domain: data.domain,
          goal: data.goal,
          intention: data.intention,
          trigger: data.trigger,
          emotionFelt: data.emotionFelt,
          behaviour: data.behaviour,
          alternateResponse: data.alternateResponse,
          notes: data.notes ?? null,
        });
        return { success: true };
      }),

    /** Delete an entry */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEmotionalEntry(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Get stats for dashboard */
    stats: protectedProcedure.query(async ({ ctx }) => {
      const entries = await getEmotionalEntriesByUser(ctx.user.id, 1000, 0);
      const total = entries.length;

      // Domain breakdown
      const domainCounts = { Boss: 0, Colleague: 0, Customer: 0 };
      entries.forEach(e => { domainCounts[e.domain]++; });

      // Streak: count consecutive days with at least one entry
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      const daySet = new Set(entries.map(e => {
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

      // This week count
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const thisWeek = entries.filter(e => new Date(e.createdAt) >= weekStart).length;

      return { total, streak, thisWeek, domainCounts };
    }),
  }),
});

export type AppRouter = typeof appRouter;
