import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JiraAccessibleResource, Projects } from "@/app/types/jira";

// ── Hoisted spies & fixtures ───────────────────────────────────────────────────
const getServerSessionMock = vi.hoisted(() => vi.fn());
const ensureFreshJiraAccessTokenMock = vi.hoisted(() => vi.fn());
const fetchProjectsMock = vi.hoisted(() => vi.fn());

const sessionAuthed = { user: { id: "u1" } } as const;
const sessionNone = null;

const resourcesOk: readonly JiraAccessibleResource[] = [
  {
    id: "site-1",
    name: "My Jira",
    url: "https://my.atlassian.net",
    scopes: ["read:jira-work", "write:jira-work"],
    avatarUrl: "https://example.com/jira.png",
  },
] as const;

const projectsOk: Projects = {
  values: [
    {
      id: "100",
      key: "DEBT",
      name: "DebtCheck",
      projectTypeKey: "software",
      simplified: true,
      style: "classic",
      isPrivate: false,
      avatarUrls: { "48x48": "https://example.com/debt.png" },
    },
  ],
};

// ── Module mocks (must be top-level) ───────────────────────────────────────────
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/app/lib/auth/auth", () => ({
  authOptions: {},
}));

vi.mock("@/app/lib/jira", () => ({
  ensureFreshJiraAccessToken: ensureFreshJiraAccessTokenMock,
  fetchProjects: fetchProjectsMock,
}));

// Mock global fetch (for /oauth/token/accessible-resources)
const globalFetchSpy = vi.hoisted(() => vi.fn());

vi.stubGlobal("fetch", globalFetchSpy);

// Import the route under test AFTER mocks
import { GET } from "@/app/api/jira/projects/route";

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonResponse<T>(body: T, init?: { status?: number; headers?: Record<string, string> }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("/api/jira/projects (GET)", () => {
  it("401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionNone);

    const res = await GET();
    expect(res.status).toBe(401);
    const j = (await res.json()) as { error: string };
    expect(j.error).toMatch(/unauthorized/i);
  });

  it("propagates error if /accessible-resources fails", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });

    globalFetchSpy.mockResolvedValueOnce(jsonResponse({ error: "bad" }, { status: 500 }));

    const res = await GET();
    expect(res.status).toBe(500);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("bad");
  });

  it("400 when no Jira site found with read:jira-work", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });

    // Return resources with wrong scopes
    const resources: JiraAccessibleResource[] = [
      { ...resourcesOk[0], scopes: ["something:else"] },
    ];
    globalFetchSpy.mockResolvedValueOnce(jsonResponse(resources));

    const res = await GET();
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toMatch(/no jira site found/i);
  });

  it("200 + returns projects when site exists", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });

    globalFetchSpy.mockResolvedValueOnce(jsonResponse(resourcesOk));
    fetchProjectsMock.mockResolvedValueOnce(projectsOk);

    const res = await GET();
    expect(res.status).toBe(200);
    const j = (await res.json()) as Projects;

    expect(fetchProjectsMock).toHaveBeenCalledWith("site-1", "tok");
    expect(j.values?.[0]?.key).toBe("DEBT");
  });
});