import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/github/repos/route";
import type { Session } from "next-auth";
import { Repo } from "@/app/types/github";

// --- Helpers ---
const makeReq = (url = "http://local/api/github/repos?page=1"): Request =>
  new Request(url);
const readJson = async <T>(res: Response): Promise<T> => res.json() as Promise<T>;

// --- Types for mocks ---

// --- Mock modules ---
const getServerSessionMock = vi.hoisted(
  () => vi.fn<() => Promise<Session | null>>()
);
const ensureFreshGithubAccessTokenMock = vi.hoisted(
  () => vi.fn<(user: string) => Promise<{ accessToken: string }>>()
);
interface CacheValue<T> {
  etag?: string;
  payload: T;
  fetchedAt: number;
  hasNext: boolean;
}

const kvGetMock = vi.hoisted(
  () => vi.fn<(key: string) => Promise<CacheValue<Repo[]> | null>>()
);
const kvSetMock = vi.hoisted(
  () => vi.fn<(key: string, value: CacheValue<Repo[]>, opts: { ex: number }) => Promise<void>>()
);

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));
vi.mock("@/lib/auth/auth", () => ({
  authOptions: {},
}));
vi.mock("@/lib/github/github", () => ({
  ensureFreshGithubAccessToken: ensureFreshGithubAccessTokenMock,
}));
vi.mock("@vercel/kv", () => ({
  kv: { get: kvGetMock, set: kvSetMock },
}));

// --- Fixtures ---
const page1: Repo[] = [
  {
    id: 1,
    full_name: "me/repo-1",
    html_url: "https://gh/1",
    owner: { login: "me", avatar_url: "" },
    private: false,
    language: "TS",
    pushed_at: "2024-01-01T00:00:00Z",
  },
];

const etag = '"W/abc123"';
const linkNext =
  '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=34>; rel="last"';

describe("/api/github/repos (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1" },
    } as Session);
    ensureFreshGithubAccessTokenMock.mockResolvedValue({ accessToken: "gh-token" });
    kvGetMock.mockResolvedValue(null);
    kvSetMock.mockResolvedValue();
  });

  it("returns 401 when no session", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when token acquisition fails", async () => {
    ensureFreshGithubAccessTokenMock.mockRejectedValueOnce(new Error("GitHub not linked"));
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe("GitHub not linked");
  });

  it("returns cached payload immediately if cache is fresh", async () => {
    kvGetMock.mockResolvedValueOnce({
      etag,
      payload: page1,
      fetchedAt: Date.now(),
      hasNext: true,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await readJson<{
      data: Repo[];
      stale: boolean;
      source: string;
    }>(res);
    expect(body.data).toEqual(page1);
    expect(body.stale).toBe(false);
    expect(body.source).toBe("cache");
  });

  it("handles 304 revalidation correctly (If-None-Match flow)", async () => {
    kvGetMock.mockResolvedValueOnce({
      etag,
      payload: page1,
      fetchedAt: Date.now() - 11 * 60 * 1000, // stale (>10min)
      hasNext: false,
    });

    const ghHeaders = new Headers({ etag, link: linkNext });
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: ghHeaders }));

    const res = await GET(makeReq());
    const body = await readJson<{
      data: Repo[];
      hasNext: boolean;
      source: string;
    }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual(page1);
    expect(body.hasNext).toBe(true);
    expect(body.source).toBe("kv-304");

    expect(kvSetMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("handles GitHub 200 OK and stores response in KV", async () => {
    const ghHeaders = new Headers({ etag, link: linkNext });
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(page1), { status: 200, headers: ghHeaders })
      );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const body = await readJson<{
      data: Repo[];
      source: string;
    }>(res);

    expect(body.data).toEqual(page1);
    expect(body.source).toBe("github-200");
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [key, stored] = kvSetMock.mock.calls[0];
    expect(key).toContain("user:u1");
    expect(stored.etag).toBe(etag);
    expect(stored.payload).toEqual(page1);
  });

  it("returns stale data when GitHub returns error but cache exists", async () => {
    kvGetMock.mockResolvedValueOnce({
      etag,
      payload: page1,
      fetchedAt: Date.now() - 11 * 60 * 1000,
      hasNext: false,
    });

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("rate limited", { status: 429 })
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const body = await readJson<{
      stale: boolean;
      source: string;
    }>(res);
    expect(body.stale).toBe(true);
    expect(body.source).toBe("kv-stale");
  });

  it("returns 502 when GitHub fails and no cache is available", async () => {
    kvGetMock.mockResolvedValueOnce(null);
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("boom", { status: 500 })
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(502);
    const body = await readJson<{ error: string; status: number }>(res);
    expect(body.error).toBe("GitHub API error");
    expect(body.status).toBe(500);
  });
});