import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { ReposPage } from "@/app/components/repos/page"; // adjust import if your path differs
import type { GithubReposResponse, Repo } from "@/app/types/github";

const makeRepo = (id: number, overrides: Partial<Repo> = {}): Repo => ({
  id,
  full_name: `owner/repo-${id}`,
  html_url: `https://github.com/owner/repo-${id}`,
  private: false,
  language: "TypeScript",
  pushed_at: "2025-01-01T00:00:00Z",
  owner: { login: "owner", avatar_url: "https://example.com/a.png" },
  ...overrides,
});

const page1: GithubReposResponse = {
  data: Array.from({ length: 3 }).map((_, i) => makeRepo(i + 1)),
  hasNext: true,
  stale: false,
  page: 1,
};

const page2: GithubReposResponse = {
  data: Array.from({ length: 3 }).map((_, i) => makeRepo(i + 4)),
  hasNext: false,
  stale: true,
  page: 2,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("<ReposPage />", () => {
  const realNow = Date.now;

  beforeEach(() => {
    vi.clearAllMocks();
    // Freeze time so timeAgo() is deterministic.
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2025-01-31T00:00:00Z").getTime()
    );
  });

  afterEach(() => {
    (Date.now as unknown) = realNow;
  });

  it("loads first page on mount, shows repos and pagination state", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(page1), { status: 200 })
      );

    render(<ReposPage />);

    // called with page=1
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/github/repos?page=1", {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      });
    });

    // Renders 3 repo cards (buttons)
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /choisir owner\/repo-/i })
      ).toHaveLength(3);
    });

    // Stale badge not shown (stale=false on page1)
    expect(
      screen.queryByText(/cache \(peut être périmé\)/i)
    ).not.toBeInTheDocument();

    // Pagination: Page 1 label; Prev disabled, Next enabled
    expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    const prev = screen.getByRole("button", { name: /previous/i });
    const next = screen.getByRole("button", { name: /next/i });
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    // Avatar rendered
    const firstCard = screen.getByRole("button", {
      name: /choisir owner\/repo-1/i,
    });
    const img = within(firstCard).getByRole("img", {
      name: /owner/i,
    }) as HTMLImageElement;
    expect(img.src).toContain("https://example.com/a.png");

    // Language and “pushed …” label (2025-01-31 vs 2025-01-01 ≈ 30 days => "1 mois")
    expect(within(firstCard).getByText(/typescript/i)).toBeInTheDocument();
    expect(within(firstCard).getByText(/pushed 1 mois/i)).toBeInTheDocument();
  });

  it("falls back to icon when no avatar, and calls onSelectRepo on click", async () => {
    const customPage: GithubReposResponse = {
      ...page1,
      data: [makeRepo(1, { owner: { login: "owner", avatar_url: "" } })],
    };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(customPage), { status: 200 })
    );

    const onSelectRepo = vi.fn();
    render(<ReposPage onSelectRepo={onSelectRepo} />);

    const card = await screen.findByRole("button", {
      name: /choisir owner\/repo-1/i,
    });

    // No <img>, fallback icon present (we can't easily query the lucide icon; just assert no <img>)
    expect(within(card).queryByRole("img")).not.toBeInTheDocument();

    await fireEvent.click(card);
    expect(onSelectRepo).toHaveBeenCalledWith(
      "https://github.com/owner/repo-1",
      expect.objectContaining({ id: 1, full_name: "owner/repo-1" })
    );
  });

  it("clicking Next loads page 2, sets stale badge when response.stale=true, and disables Next when hasNext=false", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(page1), { status: 200 })
      ) // initial
      .mockResolvedValueOnce(
        new Response(JSON.stringify(page2), { status: 200 })
      ); // page 2

    render(<ReposPage />);

    // Wait initial
    await screen.findByRole("button", { name: /choisir owner\/repo-1/i });

    // Click "Next"
    const next = screen.getByRole("button", { name: /Next/i });
    await fireEvent.click(next);

    // Called with page=2
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith("/api/github/repos?page=2", {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      });
    });

    // New page label
    expect(await screen.findByText(/page 2/i)).toBeInTheDocument();

    // Stale badge shown (page2.stale=true)
    expect(screen.getByText(/Cache potentially stale, refreshed data may be available./i)).toBeInTheDocument();

    // Next disabled (hasNext=false)
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
    // Prev enabled
    expect(
      screen.getByRole("button", { name: /Previous/i })
    ).not.toBeDisabled();
  });

  it("<ReposPage /> disables pagination while loading to prevent overlapping requests", async () => {
    // Deferred initial response
    let resolveP1!: (r: Response) => void;
    const p1 = new Promise<Response>((res) => (resolveP1 = res));

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("page=1")) return p1;
        return Promise.reject(new Error("unexpected url " + url));
      });

    render(<ReposPage />);

    // While initial load is in-flight, both buttons should be disabled
    const prev = await screen.findByRole("button", { name: /previous/i });
    const next = screen.getByRole("button", { name: /next/i });
    expect(prev).toBeDisabled();
    expect(next).toBeDisabled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Resolve page=1
    resolveP1(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 11,
              full_name: "owner/repo-1",
              html_url: "https://github.com/owner/repo-1",
              private: false,
              language: "TypeScript",
              pushed_at: new Date().toISOString(),
              owner: {
                login: "owner",
                avatar_url: "https://example.com/a.png",
              },
            },
          ],
          hasNext: true,
          stale: false,
          page: 1,
        }),
        { status: 200 }
      )
    );

    // After resolve, Next is enabled; clicking it fires the second fetch
    await screen.findByText(/Page\s*1/i);
    expect(next).not.toBeDisabled();

    // Prepare a second deferred response for page=2
    let resolveP2!: (r: Response) => void;
    const p2 = new Promise<Response>((res) => (resolveP2 = res));
    fetchSpy.mockImplementationOnce((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("page=2")) return p2;
      return Promise.reject(new Error("unexpected url " + url));
    });

    await fireEvent.click(next);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // While page=2 is loading, buttons should be disabled again
    expect(prev).toBeDisabled();
    expect(next).toBeDisabled();

    // Finish page=2 and assert UI updated
    resolveP2(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 22,
              full_name: "owner/repo-2",
              html_url: "https://github.com/owner/repo-2",
              private: false,
              language: "TypeScript",
              pushed_at: new Date().toISOString(),
              owner: {
                login: "owner",
                avatar_url: "https://example.com/a.png",
              },
            },
          ],
          hasNext: false,
          stale: true,
          page: 2,
        }),
        { status: 200 }
      )
    );

    await screen.findByText(/Page\s*2/i);
  });

  it("shows empty state when no data and not loading", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          hasNext: false,
          stale: false,
          page: 1,
        }),
        { status: 200 }
      )
    );

    render(<ReposPage />);

    // wait for loading to finish and the empty state to appear
    expect(
      await screen.findByText(/Aucun dépôt à afficher ici\./i)
    ).toBeInTheDocument();

    // sanity: no repo cards
    expect(screen.queryByRole("button", { name: /Choisir/i })).toBeNull();
  });

  it("logs error (not AbortError) but does not crash the UI", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("boom"));

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ReposPage />);

    // UI should not crash; with no data loaded it will show the empty state
    await waitFor(() => {
      expect(errSpy).toHaveBeenCalled(); // logged our non-AbortError
    });

    expect(
      await screen.findByText(/Aucun dépôt à afficher ici\./i)
    ).toBeInTheDocument();

    errSpy.mockRestore();
  });
});
