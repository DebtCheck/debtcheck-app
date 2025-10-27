import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeFileTree,
  analyzeMetadata,
  analyzeIssues,
} from "@/app/lib/analyser";
import type { RepoFileTree, RepoMetadata, RepoPRs } from "@/app/types/repo";
import { NextRequest } from "next/server";

// --- Hoisted/mocked deps ---
const fetchRepoPRMock = vi.hoisted(() => vi.fn<() => Promise<RepoPRs[]>>());
vi.mock("@/app/lib/github/github", () => ({
  fetchRepoPR: fetchRepoPRMock,
}));

describe("lib/analyser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------- analyzeFileTree ----------
  it("analyzeFileTree POSTs to Rust service with token header and returns JSON", async () => {
    process.env.RUST_URL = "http://rust";
    const payload = { ok: true } as const;

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200, statusText: "OK" })
      );

    // Minimal valid RepoFileTree for the mapping step
    const files = {
      tree: [
        { path: "src/main.ts", sha: "abc123", type: "blob" },
        { path: "README.md", sha: "def456", type: "blob" },
      ],
    } as unknown as RepoFileTree;

    const out = await analyzeFileTree(files, "gh_token", false, {
      owner: "o",
      name: "r",
    });

    // Basic call checks
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [
      string,
      RequestInit
    ];

    expect(calledUrl).toBe("http://rust/analyze");
    expect(calledInit.method).toBe("POST");
    expect(calledInit.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Github-Access-Token": "gh_token",
      })
    );

    // Inspect JSON body shape safely
    const sentBody = JSON.parse(String(calledInit.body));
    expect(sentBody.demo).toBe(false); // token present + demo=false => false

    // New shape: array of { path, url }
    expect(sentBody.tree_files).toEqual([
      {
        path: "src/main.ts",
        url: "https://api.github.com/repos/o/r/git/blobs/abc123",
      },
      {
        path: "README.md",
        url: "https://api.github.com/repos/o/r/git/blobs/def456",
      },
    ]);

    // Response passthrough
    expect(out).toEqual(payload);
  });

  it("analyzeFileTree throws an Error when Rust service is not OK", async () => {
    process.env.RUST_URL = "http://rust";
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("bad", { status: 500, statusText: "Internal Error" })
    );

    const mockFileTree = {
      tree: [
        { path: "src/main.ts", type: "blob" },
        { path: "README.md", type: "blob" },
      ],
    } as unknown as RepoFileTree;

    await expect(
      analyzeFileTree(mockFileTree, "gh_token", false, {
        owner: "o",
        name: "r",
      })
    ).rejects.toThrow(/Backend error/);
  });

  // ---------- analyzeIssues (unit) ----------
  it("analyzeIssues: no issues -> ratio 0 and neutral message", () => {
    const res = analyzeIssues(0, 0);
    expect(res).toEqual({
      issuesRatio: 0,
      isManyIssuesUnresolved: false,
      message: "No issues to analyze.",
    });
  });

  it("analyzeIssues: >50% open -> many unresolved", () => {
    const res = analyzeIssues(6, 10);
    expect(res.isManyIssuesUnresolved).toBe(true);
    expect(res.issuesRatio).toBeCloseTo(0.6, 5);
    expect(res.message).toMatch(/Many unresolved issues: 60%/);
  });

  it("analyzeIssues: clamps invalid inputs (negative, open > total)", () => {
    const over = analyzeIssues(50, 10);
    expect(over.issuesRatio).toBeCloseTo(1);
    const negative = analyzeIssues(-1, -5);
    expect(negative.issuesRatio).toBe(0);
  });

  // ---------- analyzeMetadata (integration of staleness + issues + PRs) ----------
  it("analyzeMetadata builds staleness/issue/PR reports", async () => {
    // Freeze time so staleness is deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-10-01T00:00:00Z"));

    // PRs: 2 stale (>30 days), 1 fresh
    fetchRepoPRMock.mockResolvedValueOnce([
      { created_at: "2025-07-15T00:00:00Z" }, // ~78 days old -> stale
      { created_at: "2025-08-20T00:00:00Z" }, // ~42 days old -> stale
      { created_at: "2025-09-20T00:00:00Z" }, // ~11 days old -> fresh
    ] as unknown as RepoPRs[]);

    const meta: RepoMetadata = {
      owner: "DebtCheck",
      name: "DebtCheck",
      updated_at: "2025-06-01T00:00:00Z", // very old -> stale
      pushed_at: "2025-09-28T00:00:00Z", // recent -> fresh
      open_issues_count: 3,
      total_issues_count: 10,
    } as RepoMetadata;

    // Minimal NextRequest (it isn't used in analyzePRs, but matches the signature)
    const req = new NextRequest(new Request("http://localhost"));

    const report = await analyzeMetadata(req, meta, "gh_token");

    // Staleness
    expect(report.updatedAtReport.stale).toBe(true);
    expect(report.updatedAtReport.label).toBe("updated_at");
    expect(report.pushedAtReport.stale).toBe(false);
    expect(report.pushedAtReport.label).toBe("pushed_at");

    // Issues
    expect(report.issuesReport.isManyIssuesUnresolved).toBe(false);
    expect(report.issuesReport.message).toMatch(/Good resolution rate: 30%/);

    // PRs
    expect(report.prsReport.stalePRsCount).toBe(2);
    expect(report.prsReport.message).toMatch(
      /There are 2 PRs that are 30 days old or more/
    );

    vi.useRealTimers();
  });
});
