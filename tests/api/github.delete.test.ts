import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE as githubDELETE } from "@/app/api/github/route";

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

vi.mock("@/app/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Route does a fetch to GitHub revoke endpoint
beforeEach(() => {
  vi.resetAllMocks();
  // default: authenticated session
  getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
  // default: stub global fetch
  vi.spyOn(global, "fetch").mockImplementation(fetchMock);
  // env
  vi.stubEnv("GITHUB_ID", "gid");
  vi.stubEnv("GITHUB_SECRET", "gsec");
});

// Helper to decode Basic
function basicAuthFrom(headers?: HeadersInit) {
  if (!headers) return undefined;

  // Headers instance
  if (headers instanceof Headers) {
    return headers.get("Authorization") ?? headers.get("authorization") ?? undefined;
  }

  // Array form: [ [key, value], ... ]
  if (Array.isArray(headers)) {
    const entry = (headers as Array<[string, string]>).find(
      ([k]) => k.toLowerCase() === "authorization"
    );
    return entry ? entry[1] : undefined;
  }

  // Plain object form
  const obj = headers as Record<string, string>;
  return obj["Authorization"] ?? obj["authorization"] ?? undefined;
}

describe("/api/github (DELETE)", () => {
  it("401 when no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await githubDELETE();
    expect(res.status).toBe(401);
  });

  it("200 when no account found (idempotent)", async () => {
    prismaMock.account.findFirst.mockResolvedValue(null);
    const res = await githubDELETE();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toEqual({ ok: true });
    expect(prismaMock.account.delete).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled(); // no revoke if no account
  });

  it("revoke token best-effort then delete account, returns 200", async () => {
    prismaMock.account.findFirst.mockResolvedValue({
      id: "acc1",
      access_token: "tok123",
    });

    // Revoke call: respond 204 OK (GitHub returns 204 on success)
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const res = await githubDELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Revoke call details
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/api\.github\.com\/applications\/gid\/token$/);
    expect(init?.method).toBe("DELETE");
    expect(init?.headers).toMatchObject({
      Accept: "application/vnd.github+json",
    });
    // Authorization: Basic base64(gid:gsec)
    expect(basicAuthFrom(init?.headers as HeadersInit)).toMatch(/^Basic /);

    // Deleted locally
    expect(prismaMock.account.delete).toHaveBeenCalledWith({ where: { id: "acc1" } });
  });

  it("ignores revoke failure but still deletes and returns 200", async () => {
    prismaMock.account.findFirst.mockResolvedValue({
      id: "acc1",
      access_token: "tok123",
    });
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const res = await githubDELETE();
    expect(res.status).toBe(200);
    expect(prismaMock.account.delete).toHaveBeenCalledWith({ where: { id: "acc1" } });
  });
});