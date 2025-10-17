import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE as jiraDELETE } from "@/app/api/jira/route";

// Hoisted mocks
const getServerSessionMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  account: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("next-auth/next", () => ({ getServerSession: getServerSessionMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  vi.resetAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
  vi.spyOn(global, "fetch").mockImplementation(fetchMock);
  vi.stubEnv("JIRA_CLIENT_ID", "jid");
  vi.stubEnv("JIRA_CLIENT_SECRET", "jsec");
});

function lastBody() {
  const [, init] = fetchMock.mock.calls.at(-1)!;
  return init?.body ? JSON.parse(init.body as string) : null;
}

describe("/api/account/jira (DELETE)", () => {
  it("401 when no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await jiraDELETE();
    expect(res.status).toBe(401);
  });

  it("200 when no account found (idempotent)", async () => {
    prismaMock.account.findFirst.mockResolvedValue(null);
    const res = await jiraDELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.account.delete).not.toHaveBeenCalled();
  });

  it("revoke access & refresh tokens best-effort, then delete account", async () => {
    prismaMock.account.findFirst.mockResolvedValue({
      id: "acc2",
      access_token: "accTok",
      refresh_token: "refTok",
    });

    // Two revoke POSTs (order doesn't matter)
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const res = await jiraDELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Two calls to revoke endpoint
    const revokeCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("auth.atlassian.com/oauth/revoke")
    );
    expect(revokeCalls.length).toBe(2);

    // Check one body shape
    const bodyA = lastBody();
    expect(bodyA).toHaveProperty("client_id", "jid");
    expect(bodyA).toHaveProperty("client_secret", "jsec");
    // Deleted locally
    expect(prismaMock.account.delete).toHaveBeenCalledWith({ where: { id: "acc2" } });
  });

  it("ignores revoke failures and still deletes", async () => {
    prismaMock.account.findFirst.mockResolvedValue({
      id: "acc2",
      access_token: "accTok",
      refresh_token: "refTok",
    });

    fetchMock.mockRejectedValueOnce(new Error("fail1"));
    fetchMock.mockRejectedValueOnce(new Error("fail2"));

    const res = await jiraDELETE();
    expect(res.status).toBe(200);
    expect(prismaMock.account.delete).toHaveBeenCalledWith({ where: { id: "acc2" } });
  });
});