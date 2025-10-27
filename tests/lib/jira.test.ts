import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  JiraAccessibleResource,
  JiraAccount,
  Projects as JiraProjectsType,
} from "@/app/types/jira";

// ---- Hoisted mocks (avoid hoisting traps)
const prismaMock = vi.hoisted(() => ({
  account: {
    findFirst: vi.fn<() => Promise<JiraAccount | null>>(),
    update: vi.fn<() => Promise<JiraAccount>>(),
  },
}));

vi.mock("@/app/lib/prisma", () => ({ prisma: prismaMock }));

// Import SUT after mocks
import {
  getJiraAccount,
  refreshJira,
  ensureFreshJiraAccessToken,
  fetchAccessibleResources,
  fetchProjects,
} from "@/app/lib/jira/jira";

describe("lib/jira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------- getJiraAccount ----------
  it("getJiraAccount queries prisma with provider in ['atlassian','jira']", async () => {
    prismaMock.account.findFirst.mockResolvedValueOnce({ id: "acc1" } as unknown as JiraAccount);
    const res = await getJiraAccount("user-123");
    expect(prismaMock.account.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-123", provider: { in: expect.any(Array) } },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });
    expect(res?.id).toBe("acc1");
  });

  // ---------- refreshJira ----------
  it("refreshJira returns null when no refresh_token", async () => {
    const acc: JiraAccount = {
      id: "a1",
      userId: "u",
      provider: "jira",
      providerAccountId: "p",
      access_token: "tok",
      refresh_token: null,
      expires_at: 0,
    };
    const out = await refreshJira(acc);
    expect(out).toBeNull();
  });

  it("refreshJira returns null when token endpoint is not ok", async () => {
    const acc = { id: "a1", refresh_token: "r1" } as unknown as JiraAccount;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response("", { status: 400 }));
    const out = await refreshJira(acc);
    expect(out).toBeNull();
  });

  it("refreshJira updates prisma and returns updated account", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const acc = {
      id: "a1",
      userId: "u",
      provider: "jira",
      providerAccountId: "p",
      access_token: "old",
      refresh_token: "r1",
      expires_at: 0,
    } as JiraAccount;

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "new", refresh_token: "r2", expires_in: 3600 }), { status: 200 })
    );

    const expectedExpires = Math.floor(Date.now() / 1000) + 3600 - 60;

    prismaMock.account.update.mockResolvedValueOnce({
      ...acc,
      access_token: "new",
      refresh_token: "r2",
      expires_at: expectedExpires,
    } as JiraAccount);

    const out = await refreshJira(acc);
    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        access_token: "new",
        refresh_token: "r2",
        expires_at: expectedExpires,
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });
    expect(out?.access_token).toBe("new");

    vi.useRealTimers();
  });

  // ---------- ensureFreshJiraAccessToken ----------
  it("ensureFreshJiraAccessToken throws when not linked", async () => {
    prismaMock.account.findFirst.mockResolvedValueOnce(null);
    await expect(ensureFreshJiraAccessToken("u1")).rejects.toThrow("Jira not linked");

    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "a1",
      access_token: null,
    } as unknown as JiraAccount);
    await expect(ensureFreshJiraAccessToken("u1")).rejects.toThrow("Jira not linked");
  });

  it("ensureFreshJiraAccessToken returns current token when not expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const now = Math.floor(Date.now() / 1000);

    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "a1",
      userId: "u",
      provider: "jira",
      providerAccountId: "p",
      access_token: "live",
      refresh_token: "r1",
      expires_at: now + 999,
    } as JiraAccount);

    const res = await ensureFreshJiraAccessToken("u1");
    expect(res.accessToken).toBe("live");

    vi.useRealTimers();
  });

  it("ensureFreshJiraAccessToken refreshes when expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    // expired account
    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "a1",
      userId: "u",
      provider: "jira",
      providerAccountId: "p",
      access_token: "old",
      refresh_token: "r1",
      expires_at: Math.floor(Date.now() / 1000) - 1,
    } as JiraAccount);

    // token refresh OK
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "new", refresh_token: "r2", expires_in: 3600 }), { status: 200 })
    );

    prismaMock.account.update.mockResolvedValueOnce({
      id: "a1",
      userId: "u",
      provider: "jira",
      providerAccountId: "p",
      access_token: "new",
      refresh_token: "r2",
      expires_at: Math.floor(Date.now() / 1000) + 3600 - 60,
    } as JiraAccount);

    const res = await ensureFreshJiraAccessToken("u1");
    expect(res.accessToken).toBe("new");

    vi.useRealTimers();
  });

  it("ensureFreshJiraAccessToken throws when refresh fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "a1",
      access_token: "old",
      refresh_token: "r1",
      expires_at: Math.floor(Date.now() / 1000) - 10,
      userId: "u",
      provider: "jira",
      providerAccountId: "p",
    } as JiraAccount);

    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response("", { status: 400 }));

    await expect(ensureFreshJiraAccessToken("u1")).rejects.toThrow("Jira refresh failed");

    vi.useRealTimers();
  });

  // ---------- fetchAccessibleResources ----------
  it("fetchAccessibleResources returns id/name for a site with read:jira-work", async () => {
    const resources: JiraAccessibleResource[] = [
      { id: "x", name: "Nope", url: "u", scopes: ["read:me"] },
      { id: "cloud-1", name: "My Jira", url: "u2", scopes: ["read:jira-work", "read:me"] },
    ];
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(resources), { status: 200 })
    );
    const out = await fetchAccessibleResources("token");
    expect(out).toEqual({ id: "cloud-1", name: "My Jira" });
  });

  it("fetchAccessibleResources throws with status and jiraError on non-OK", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), { status: 401, statusText: "Unauthorized" })
    );
    await expect(fetchAccessibleResources("token")).rejects.toMatchObject({
      message: expect.stringContaining("Failed to fetch user info"),
      status: 401,
      jiraError: { error: "bad" },
    });
  });

  it("fetchAccessibleResources throws when no acceptable site", async () => {
    const resources: JiraAccessibleResource[] = [
      { id: "x", name: "Nope", url: "u", scopes: ["read:me"] },
    ];
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(resources), { status: 200 })
    );
    await expect(fetchAccessibleResources("token")).rejects.toThrow("No accessible Jira site found");
  });

  // ---------- fetchProjects ----------
  it("fetchProjects hits Jira API and returns parsed JSON", async () => {
    const payload: JiraProjectsType = { total: 1, values: [{ id: "10000", key: "DEBT", name: "DebtCheck" }] } as unknown as JiraProjectsType;
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 })
    );

    const out = await fetchProjects("cloud-1", "token");
    expect(spy).toHaveBeenCalledWith(
      "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/project/search",
      {
        headers: { Authorization: "Bearer token", Accept: "application/json" },
        cache: "no-store",
      }
    );
    expect(out).toEqual(payload);
  });
});