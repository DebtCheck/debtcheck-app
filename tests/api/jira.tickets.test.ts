import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Report, DeadCodeKind } from "@/types/report";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
const getServerSessionMock = vi.hoisted(() => vi.fn());
const ensureFreshJiraAccessTokenMock = vi.hoisted(() => vi.fn());
const fetchAccessibleResourcesMock = vi.hoisted(() => vi.fn());

const sessionAuthed = { user: { id: "u1" } } as const;
const sessionNone = null;

// Mock fetch for Jira issue creation
const globalFetchSpy = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", globalFetchSpy);

// ── Module mocks ───────────────────────────────────────────────────────────────
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/jira", () => ({
  ensureFreshJiraAccessToken: ensureFreshJiraAccessTokenMock,
  fetchAccessibleResources: fetchAccessibleResourcesMock,
}));

// Import AFTER mocks
import { POST } from "@/app/api/jira/tickets/route";
import type { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makePost(body: unknown): NextRequest {
  // NextRequest is a superset of Request; this is fine for our route signature
  return new Request("http://localhost/api/jira/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function jsonResponse<T>(body: T, init?: { status?: number }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Minimal, but valid Report fixture to trigger actions ───────────────────────
const reportWithIssues: Report = {
  pushedAtReport: {
    stale: true,
    message: "Repo pushed long ago",
    label: "",
    daysSinceUpdate: 90
  },
  updatedAtReport: {
    stale: true,
    message: "Repo not updated for a while",
    label: "",
    daysSinceUpdate: 90
  },
  issuesReport: {
    isManyIssuesUnresolved: true,
    message: "Too many unresolved issues",
    issuesRatio: 0
  },
  prsReport: {
    stalePRsCount: 2,
    message: "There are stale PRs",
  },
  fileTreeReport: {
    dead_code: [{
      file: "src/old.ts", line: 10, name: "OldComp", kind: "function" as DeadCodeKind,
      column: 0
    }],
    deprecated_libs: [
      { name: "left-pad", current: "1.0.0", latest: "1.3.0", deprecated: true, status: "error" },
    ],
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("/api/jira/tickets (POST)", () => {
  it("401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionNone);
    const res = await POST(makePost({ projectId: "100", report: reportWithIssues }));
    expect(res.status).toBe(401);
  });

  it("400 when invalid body (missing report)", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });

    const res = await POST(makePost({ projectId: "100" }));
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toMatch(/invalid report/i);
  });

  it("400 when invalid body (missing projectId)", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });

    const res = await POST(makePost({ report: reportWithIssues }));
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toMatch(/invalid project id/i);
  });

  it("200 and NO external calls when no issues detected", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });
    fetchAccessibleResourcesMock.mockResolvedValueOnce({ id: "site-1" });

    const cleanReport: Report = {
      ...reportWithIssues,
      updatedAtReport: {
        stale: false, message: "",
        label: "",
        daysSinceUpdate: 0
      },
      issuesReport: {
        isManyIssuesUnresolved: false, message: "",
        issuesRatio: 0
      },
      prsReport: { stalePRsCount: 0, message: "" },
      fileTreeReport: { dead_code: [], deprecated_libs: [] },
    };

    const res = await POST(makePost({ projectId: "100", report: cleanReport }));
    expect(res.status).toBe(200);
    const j = (await res.json()) as string | { message?: string };
    expect(typeof j === "string" ? j : j.message).toMatch(/no jira tickets created/i);
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it("creates one Jira issue per detected problem", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionAuthed);
    ensureFreshJiraAccessTokenMock.mockResolvedValueOnce({ accessToken: "tok" });
    fetchAccessibleResourcesMock.mockResolvedValueOnce({ id: "site-1" });

    // Every Jira POST responds 201 with a key
    globalFetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const urlStr = String(input);
      if (urlStr.includes("/rest/api/3/issue")) {
        return jsonResponse({ key: "DEBT-1" }, { status: 201 });
      }
      return jsonResponse({}, { status: 404 });
    });

    const res = await POST(makePost({ projectId: "100", report: reportWithIssues }));
    expect(res.status).toBe(200);

    // We expect 4 tickets here (stale repo, unresolved issues, stale PRs, dead code, deprecated libs) → 5
    // Count them precisely:
    const calls = globalFetchSpy.mock.calls.filter(([req]) =>
      String(req).includes("/rest/api/3/issue")
    );
    expect(calls.length).toBe(5);

    // Validate one payload example (e.g., the “Stale PRs” one)
    const bodies = calls.map(([, init]) => (init as RequestInit).body as string);
    const parsed = bodies.map((b) => JSON.parse(b) as { fields: { summary: string } });
    expect(parsed.some((p) => /Stale pull requests/i.test(p.fields.summary))).toBe(true);
  });
});