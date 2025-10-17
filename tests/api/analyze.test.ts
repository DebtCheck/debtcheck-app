import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/analyze/route";
import type { Report } from "@/types/report";
import { NextRequest } from "next/server";

// ---- Hoisted spies (must be declared with vi.hoisted) ----
const getServerSessionMock = vi.hoisted(() => vi.fn());
const ensureFreshGithubAccessTokenMock = vi.hoisted(() => vi.fn());
const fetchRepoMetadataMock = vi.hoisted(() => vi.fn());
const fetchRepoFileTreeMock = vi.hoisted(() => vi.fn());
const filterFilesMock = vi.hoisted(() => vi.fn());
const analyzeMetadataMock = vi.hoisted(() => vi.fn());
const analyzeFileTreeMock = vi.hoisted(() => vi.fn());

// next-auth
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

// libs
vi.mock("@/lib/github/github", () => ({
  ensureFreshGithubAccessToken: ensureFreshGithubAccessTokenMock,
  fetchRepoMetadata: fetchRepoMetadataMock,
  fetchRepoFileTree: fetchRepoFileTreeMock,
  filterFiles: filterFilesMock,
}));

vi.mock("@/lib/analyser", () => ({
  analyzeMetadata: analyzeMetadataMock,
  analyzeFileTree: analyzeFileTreeMock,
}));

// ---- Helpers ----
function makeReq(body: unknown): NextRequest {
  const base = new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  type MutableNextRequest = Omit<NextRequest, "cookies" | "nextUrl" | "page" | "ua"> & {
    cookies?: NextRequest["cookies"];
    nextUrl?: unknown;
    page?: { name: string };
    ua?: { browser: string };
  };

  const nextReq = base as unknown as MutableNextRequest;
  nextReq.cookies = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get: (_name?: string) => undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set: (_cookie: unknown) => undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    delete: (_names: string | string[]) => false,
  } as unknown as NextRequest["cookies"];
  // cast the URL to the NextRequest['nextUrl'] type so TypeScript accepts the assignment
  nextReq.nextUrl = new URL(base.url) as unknown as NextRequest["nextUrl"];
  nextReq.page = { name: "api/analyze" };
  nextReq.ua = { browser: "vitest" };
  return nextReq as NextRequest;
}
function okSession(userId = "u1") {
  getServerSessionMock.mockResolvedValue({ user: { id: userId } } as never);
}

function noSession() {
  getServerSessionMock.mockResolvedValue(null as never);
}

function githubTokenOK(token = "gh_tok") {
  ensureFreshGithubAccessTokenMock.mockResolvedValue({ accessToken: token });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- Tests ----
describe("/api/analyze (POST)", () => {
  it("400 when repoUrl missing", async () => {
    okSession();
    const res = await POST(makeReq({})); // no repoUrl
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing repo URL" });
  });

  it("400 when invalid GitHub URL", async () => {
    okSession();
    const res = await POST(makeReq({ repoUrl: "https://example.com/foo/bar" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid GitHub URL" });
  });

  it("401 when no session", async () => {
    noSession();
    const res = await POST(makeReq({ repoUrl: "https://github.com/owner/repo" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("401 when token refresh fails", async () => {
    okSession();
    ensureFreshGithubAccessTokenMock.mockRejectedValue(new Error("GitHub not linked"));
    const res = await POST(makeReq({ repoUrl: "https://github.com/owner/repo" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "GitHub not linked" });
  });

  it("413 when repository too large", async () => {
    okSession();
    githubTokenOK();

    // fetchRepoMetadata returns huge repo
    fetchRepoMetadataMock.mockResolvedValue({
      owner: { login: "owner" },
      name: "repo",
      description: "desc",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
      pushed_at: "2024-01-12T00:00:00Z",
      size: 2_000_001, // > 2,000,000 threshold
      stargazers_count: 0,
      forks_count: 0,
      watchers_count: 0,
      open_issues_count: 0,
      total_issues_count: 0,
      subscribers_count: 0,
      pulls_url: "x",
      default_branch: "main",
      trees_url: "trees",
    });

    const res = await POST(makeReq({ repoUrl: "https://github.com/owner/repo" }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Repository too large to analyze safely." });
  });

  it("maps OAuth App blocked error to OAUTH_APP_BLOCKED", async () => {
    okSession();
    githubTokenOK();

    const err = Object.assign(new Error("blocked"), {
      status: 403,
      githubError: { message: "Organization has enabled OAuth App access restrictions" },
    });

    fetchRepoMetadataMock.mockRejectedValue(err);

    const res = await POST(makeReq({ repoUrl: "https://github.com/acme/repo" }));
    expect(res.status).toBe(403);
    const j = (await res.json()) as {
      error: string;
      details: { type: string; docsUrl?: string; status: number };
    };
    expect(j.details.type).toBe("OAUTH_APP_BLOCKED");
    expect(j.details.status).toBe(403);
    expect(j.details.docsUrl).toMatch(/restricting-access/i);
  });

  it("maps SAML enforcement error to SSO_NOT_AUTHORIZED with org docs URL", async () => {
    okSession();
    githubTokenOK();

    const err = Object.assign(new Error("saml"), {
      status: 403,
      githubError: { message: "SAML enforcement in effect" },
    });

    fetchRepoMetadataMock.mockRejectedValue(err);

    const res = await POST(makeReq({ repoUrl: "https://github.com/acme/repo" }));
    expect(res.status).toBe(403);
    const j = (await res.json()) as {
      error: string;
      details: { type: string; docsUrl?: string; status: number };
    };
    expect(j.details.type).toBe("SSO_NOT_AUTHORIZED");
    expect(j.details.docsUrl).toBe("https://github.com/orgs/acme/sso");
  });

  it("generic GitHub API error path with status fallback", async () => {
    okSession();
    githubTokenOK();

    const err = Object.assign(new Error("boom"), {
      githubError: { message: "Some GH error" },
      status: 418,
    });

    fetchRepoMetadataMock.mockRejectedValue(err);

    const res = await POST(makeReq({ repoUrl: "https://github.com/owner/repo" }));
    expect(res.status).toBe(418);
    const j = (await res.json()) as {
      error: string;
      details: { type: string; status: number };
    };
    expect(j.error).toBe("Some GH error");
    expect(j.details.type).toBe("GITHUB_ERROR");
    expect(j.details.status).toBe(418);
  });

  it("handles clone URLs (ends with .git) and returns computed report", async () => {
    okSession();
    githubTokenOK();

    // minimal GH metadata raw → route maps to RepoMetadata
    fetchRepoMetadataMock.mockResolvedValue({
      owner: { login: "owner" },
      name: "repo",
      description: "desc",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
      pushed_at: "2024-01-12T00:00:00Z",
      size: 12345,
      stargazers_count: 7,
      forks_count: 8,
      watchers_count: 9,
      open_issues_count: 10,
      total_issues_count: 11,
      subscribers_count: 12,
      pulls_url: "https://api.github.com/repos/owner/repo/pulls{/number}",
      default_branch: "main",
      trees_url: "https://api.github.com/repos/owner/repo/git/trees/main",
    });

    // file tree path
    fetchRepoFileTreeMock.mockResolvedValue({ tree: [] });
    filterFilesMock.mockResolvedValue(["/src/index.ts"]);

    // analyzer outputs
    analyzeMetadataMock.mockResolvedValue({
      updatedAtReport: { stale: false, message: "ok" },
      pushedAtReport: { stale: false, message: "ok" },
      issuesReport: { isManyIssuesUnresolved: false, message: "ok" },
      prsReport: { stalePRsCount: 0, message: "ok" },
    });

    analyzeFileTreeMock.mockResolvedValue({
      dead_code: [],
      deprecated_libs: [],
    });

    const res = await POST(makeReq({ repoUrl: "https://github.com/owner/repo.git" }));
    expect(res.status).toBe(200);

    const j = (await res.json()) as { ok: true; data: Report };
    expect(j.ok).toBe(true);
    expect(j.data.fileTreeReport?.dead_code).toEqual([]);
    expect(j.data.updatedAtReport?.stale).toBe(false);
  });

  it("500 on unexpected errors", async () => {
    okSession();
    githubTokenOK();
    fetchRepoMetadataMock.mockRejectedValue(new Error("weird"));

    const res = await POST(makeReq({ repoUrl: "https://github.com/owner/repo" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Unexpected error processing repo" });
  });
});