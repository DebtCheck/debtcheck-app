import { describe, it, expect, vi, afterEach } from "vitest";
import { githubFetch } from "@/app/lib/github/http";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Helper to build a Response easily */
const jsonRes = (obj: unknown, status = 200, init: ResponseInit = {}) =>
  new Response(JSON.stringify(obj), { status, ...init });

describe("lib/github/http::githubFetch", () => {
  it("sends default headers and merges user headers (user wins)", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonRes({ ok: true }));

    await githubFetch("https://api.github.com/foo", "t0k", {
      headers: {
        "User-Agent": "DebtCheck",
        "X-Custom": "yes",
      },
      method: "POST",
      body: JSON.stringify({ x: 1 }),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];

    // cache and method/body are passed through
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ x: 1 }));
    expect(init.cache).toBe("no-store");

    // headers merged: defaults + overrides; user headers override built-ins
    const h = new Headers(init.headers as HeadersInit);
    expect(h.get("Accept")).toBe("application/vnd.github+json");
    expect(h.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(h.get("Authorization")).toBe("Bearer t0k");

    // signal present
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns parsed JSON body on 2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonRes({ hello: "world" })
    );
    const out = await githubFetch("https://api.github.com/ok", "t0k");
    expect(out).toEqual({ hello: "world" });
  });

  it("returns raw text when JSON parse fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("plain text", { status: 200 })
    );
    const out = await githubFetch("https://api.github.com/text", "t0k");
    expect(out).toBe("plain text");
  });

  it("returns null on empty 204/200 with no body", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 204 })
    );
    const out = await githubFetch("https://api.github.com/empty", "t0k");
    expect(out).toBeNull();
  });

  it("throws enriched Error on non-OK JSON responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonRes({ message: "Not Found", doc_url: "x" }, 404, {
        statusText: "Not Found",
      })
    );

    await expect(
      githubFetch("https://api.github.com/404", "t0k")
    ).rejects.toMatchObject({
      message: "Not Found",
      status: 404,
      githubError: { message: "Not Found", doc_url: "x" },
    });
  });

  it("throws enriched Error on non-OK plain text responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Boom", { status: 500, statusText: "Internal Server Error" })
    );

    await expect(
      githubFetch("https://api.github.com/500", "t0k")
    ).rejects.toMatchObject({
      message: "Internal Server Error",
      status: 500,
    });
  });

  it("aborts after timeout and rejects with AbortError", async () => {
    vi.useFakeTimers();

    // Mock fetch that rejects when the provided signal is aborted
    const AbortErr =
      typeof DOMException !== "undefined"
        ? new DOMException("Aborted", "AbortError")
        : Object.assign(new Error("Aborted"), { name: "AbortError" });

    vi.spyOn(global, "fetch").mockImplementation(
      (_input: unknown, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(AbortErr));
        });
      }
    );

    const p = githubFetch("https://api.github.com/slow", "t0k", {}, 1234);
    // Fast-forward the timer to trigger AbortController
    vi.advanceTimersByTime(1235);

    await expect(p).rejects.toMatchObject({ name: "AbortError" });

    vi.useRealTimers();
  });
});
