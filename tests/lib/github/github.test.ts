import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// IMPORTANT: mock the *same* module ids your file uses:
// github.ts imports "../prisma" and "./http", so from this test file
// we mock them via relative paths that resolve to the same files.
const prismaMock = vi.hoisted(() => ({
  account: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const githubFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/github/http", () => ({ githubFetch: githubFetchMock }));

// Now import the module under test
import {
  getGithubAccount,
  refreshGithub,
  ensureFreshGithubAccessToken,
  fetchRepoMetadata,
  fetchRepoIssues,
  fetchRepoFileTree,
  fetchRepoPR,
  filterFiles,
} from "@/app/lib/github/github";
import type { GithubAccount } from "@/app/types/github";
import type { RepoFileTree } from "@/app/types/repo";

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lib/github/github", () => {
  // ---------- getGithubAccount ----------
  it("getGithubAccount calls prisma with correct where/select", async () => {
    prismaMock.account.findFirst.mockResolvedValueOnce({ id: "acc1" });
    const res = await getGithubAccount("user-123");
    expect(prismaMock.account.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-123", provider: "github" },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
        scope: true,
        token_type: true,
      },
    });
    expect(res).toEqual({ id: "acc1" });
  });

  it("refreshGithub returns null if no refresh_token", async () => {
    const acc = { id: "acc1", refresh_token: null };
    const out = await refreshGithub(acc as unknown as GithubAccount);
    expect(out).toBeNull();
    expect(global.fetch).toBeDefined(); // just sanity (polyfilled by setup)
  });
  it("refreshGithub returns null if HTTP not ok", async () => {
    const acc = { id: "acc1", refresh_token: "r1" };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("", { status: 400 })
    );
    const out = await refreshGithub(acc as unknown as GithubAccount);
    expect(out).toBeNull();
  });
  it("refreshGithub returns null if response has error or no access_token", async () => {
    const acc = { id: "acc1", refresh_token: "r1" };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad", error_description: "x" }), {
        status: 200,
      })
    );
    const out = await refreshGithub(acc as unknown as GithubAccount);
    expect(out).toBeNull();
  });

  it("refreshGithub updates prisma and returns updated account", async () => {
    // freeze time to test expires_at calc
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z")); // epoch 1735689600000

    const acc = {
      id: "acc1",
      refresh_token: "r1",
      token_type: "bearer",
      scope: "repo",
      expires_at: 0,
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "new-token",
          token_type: "bearer",
          scope: "repo",
          refresh_token: "r2",
          expires_in: 3600, // 1h
        }),
        { status: 200 }
      )
    );

    prismaMock.account.update.mockResolvedValueOnce({
      id: "acc1",
      access_token: "new-token",
      refresh_token: "r2",
      token_type: "bearer",
      scope: "repo",
      expires_at: Math.floor(Date.now() / 1000) + 3600 - 60, // computed in impl
    });
    const out = await refreshGithub(acc as unknown as GithubAccount);
    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: "acc1" },
      data: expect.objectContaining({
        access_token: "new-token",
        refresh_token: "r2",
        token_type: "bearer",
        scope: "repo",
      }),
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
        scope: true,
        token_type: true,
      },
    });
    expect(out?.access_token).toBe("new-token");
    expect(out?.access_token).toBe("new-token");
  });

  // ---------- ensureFreshGithubAccessToken ----------
  it("ensureFreshGithubAccessToken throws if no account or no token", async () => {
    prismaMock.account.findFirst.mockResolvedValueOnce(null);
    await expect(ensureFreshGithubAccessToken("u1")).rejects.toThrow(
      "GitHub not linked"
    );

    prismaMock.account.findFirst.mockResolvedValueOnce({ access_token: null });
    await expect(ensureFreshGithubAccessToken("u1")).rejects.toThrow(
      "GitHub not linked"
    );
  });

  it("ensureFreshGithubAccessToken returns current token if not expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const nowSec = Math.floor(Date.now() / 1000);

    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "acc1",
      access_token: "tok",
      expires_at: nowSec + 999, // not expired
    });

    const res = await ensureFreshGithubAccessToken("u1");
    expect(res.accessToken).toBe("tok");
    expect(res.account.id).toBe("acc1");
  });

  it("ensureFreshGithubAccessToken refreshes if expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "acc1",
      access_token: "old",
      refresh_token: "r1",
      expires_at: Math.floor(Date.now() / 1000) - 10, // expired
      token_type: "bearer",
      scope: "repo",
    });

    // make refreshGithub path work through fetch + prisma update
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "new-token",
          token_type: "bearer",
          scope: "repo",
          refresh_token: "r2",
          expires_in: 3600,
        }),
        { status: 200 }
      )
    );
    prismaMock.account.update.mockResolvedValueOnce({
      id: "acc1",
      access_token: "new-token",
      refresh_token: "r2",
      expires_at: Math.floor(Date.now() / 1000) + 3600 - 60,
      token_type: "bearer",
      scope: "repo",
    });

    const res = await ensureFreshGithubAccessToken("u1");
    expect(res.accessToken).toBe("new-token");
    expect(res.account.refresh_token).toBe("r2");
  });

  it("ensureFreshGithubAccessToken throws if refresh fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    prismaMock.account.findFirst.mockResolvedValueOnce({
      id: "acc1",
      access_token: "old",
      refresh_token: "r1",
      expires_at: Math.floor(Date.now() / 1000) - 10,
    });

    // refreshGithub returns null -> simulate fetch 400
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("", { status: 400 })
    );

    await expect(ensureFreshGithubAccessToken("u1")).rejects.toThrow(
      "GitHub refresh not available; please reconnect GitHub"
    );
  });

  // ---------- lightweight wrappers around githubFetch ----------
  it("fetchRepoMetadata delegates to githubFetch", async () => {
    githubFetchMock.mockResolvedValueOnce({ ok: true });
    const out = await fetchRepoMetadata("DebtCheck", "DebtCheck", "tok");
    expect(githubFetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/DebtCheck/DebtCheck",
      "tok"
    );
    expect(out).toEqual({ ok: true });
  });

  it("fetchRepoIssues delegates to githubFetch", async () => {
    githubFetchMock.mockResolvedValueOnce({ total_count: 1 });
    await fetchRepoIssues("o", "r", "tok");
    expect(githubFetchMock).toHaveBeenCalledWith(
      "https://api.github.com/search/issues?q=repo:o/r+type:issue",
      "tok"
    );
  });

  it("fetchRepoFileTree replaces {sha} and adds recursive=1", async () => {
    githubFetchMock.mockReset();
    githubFetchMock.mockResolvedValueOnce({ tree: [] });
    await fetchRepoFileTree(
      "https://api.github.com/repos/o/r/git/trees/{/sha}",
      "tok"
    );
    expect(githubFetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/o/r/git/trees/HEAD?recursive=1",
      "tok"
    );
  });

  // ---------- fetchRepoPR (pagination + error) ----------
  it("fetchRepoPR paginates until fewer than perPage", async () => {
    // First page returns 100, second returns 20 -> stop
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const page2 = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i + 1 }));

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(page1), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(page2), { status: 200 })
      );

    const out = await fetchRepoPR("o", "r", "tok");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(120);
  });

  it("fetchRepoPR throws on non-OK response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("nope", { status: 500, statusText: "Internal Error" })
    );
    await expect(fetchRepoPR("o", "r", "tok")).rejects.toThrow(
      /Error fetching repo PRs/i
    );
  });

  // ---------- filterFiles ----------
  it("filterFiles throws on invalid tree", async () => {
    await expect(filterFiles(null as unknown as RepoFileTree)).rejects.toThrow(
      "Invalid GitHub tree response"
    );
    await expect(filterFiles({} as unknown as RepoFileTree)).rejects.toThrow(
      "Invalid GitHub tree response"
    );
  });

  it("filterFiles keeps only blobs with allowed extensions", async () => {
    const fileTree = {
      tree: [
        { path: "src/a.ts", type: "blob" },
        { path: "src/b.tsx", type: "blob" },
        { path: "README.md", type: "blob" },
        { path: "Dockerfile", type: "blob" },
        { path: "dir", type: "tree" },
        { path: ".env.local", type: "blob" },
        { path: "workflow.yml", type: "blob" },
      ],
    };
    const out = await filterFiles(fileTree as unknown as RepoFileTree);
    // allowed: .ts .tsx .md .env .yml
    expect((out as Array<{ path: string }>).map((f) => f.path)).toEqual([
      "src/a.ts",
      "src/b.tsx",
      "README.md",
      "workflow.yml",
    ]);
  });
});
