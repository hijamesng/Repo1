import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  createEmotionalEntry: vi.fn().mockResolvedValue({ insertId: 1 }),
  getEmotionalEntriesByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      domain: "Boss",
      goal: "Communicate project status",
      intention: "Stay calm and open",
      trigger: "Boss interrupted me",
      emotionFelt: "Frustrated",
      behaviour: "Freeze",
      alternateResponse: "Take a breath and ask for time",
      notes: null,
      createdAt: new Date("2026-01-01T10:00:00Z"),
      updatedAt: new Date("2026-01-01T10:00:00Z"),
    },
  ]),
  getEmotionalEntryById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    domain: "Boss",
    goal: "Communicate project status",
    intention: "Stay calm and open",
    trigger: "Boss interrupted me",
    emotionFelt: "Frustrated",
    behaviour: "Freeze",
    alternateResponse: "Take a breath and ask for time",
    notes: null,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    updatedAt: new Date("2026-01-01T10:00:00Z"),
  }),
  deleteEmotionalEntry: vi.fn().mockResolvedValue(true),
  getEmotionalEntriesCountByUser: vi.fn().mockResolvedValue(1),
  getRecentEmotionalEntries: vi.fn().mockResolvedValue([]),
}));

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const validEntryInput = {
  domain: "Boss" as const,
  goal: "Communicate project status clearly",
  intention: "Stay calm and listen openly",
  trigger: "Boss interrupted me during the presentation",
  emotionFelt: "Frustrated",
  behaviour: "I froze and went silent",
  alternateResponse: "Next time I will calmly ask for a moment to finish my thought",
};

describe("entries.create", () => {
  it("creates an entry for an authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.entries.create(validEntryInput);
    expect(result).toEqual({ success: true });
  });

  it("requires all mandatory fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.entries.create({ ...validEntryInput, goal: "" })
    ).rejects.toThrow();
  });
});

describe("entries.list", () => {
  it("returns entries for the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.entries.list({ limit: 10, offset: 0 });
    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.entries[0].domain).toBe("Boss");
  });
});

describe("entries.getById", () => {
  it("returns a single entry by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.entries.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.emotionFelt).toBe("Frustrated");
  });

  it("throws when entry is not found", async () => {
    const { getEmotionalEntryById } = await import("./db");
    vi.mocked(getEmotionalEntryById).mockResolvedValueOnce(null);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.entries.getById({ id: 999 })).rejects.toThrow("Entry not found");
  });
});

describe("entries.delete", () => {
  it("deletes an entry for the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.entries.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("entries.stats", () => {
  it("returns stats for the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.entries.stats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("streak");
    expect(result).toHaveProperty("thisWeek");
    expect(result).toHaveProperty("domainCounts");
    expect(result.domainCounts).toHaveProperty("Boss");
    expect(result.domainCounts).toHaveProperty("Colleague");
    expect(result.domainCounts).toHaveProperty("Customer");
  });
});
