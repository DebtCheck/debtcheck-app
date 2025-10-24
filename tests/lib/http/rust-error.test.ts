import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchJsonOrThrow } from "@/lib/http/rust-error";
import { ApiError } from "@/lib/http/response";

/** Helper: JSON Response with correct headers */
function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** Helper: plain-text Response */
function textResponse(text: string, init?: ResponseInit): Response {
  return new Response(text, init);
}

describe("fetchJsonOrThrow", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed JSON when status is 200", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse({ ok: true, n: 1 }, { status: 200 })
    );
    const out = await fetchJsonOrThrow<{ ok: boolean; n: number }>("/ok");
    expect(out).toEqual({ ok: true, n: 1 });
  });

  it("wraps network failure into ApiError (502 upstream_error)", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("connection refused"));
    await expect(fetchJsonOrThrow("/fail")).rejects.toBeInstanceOf(ApiError);
    await expect(fetchJsonOrThrow("/fail")).rejects.toMatchObject({
      status: 502,
      code: "upstream_error",
    } satisfies Partial<ApiError>);
  });

  it("handles top-level structured error with Retry-After number", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse(
        { code: "rate_limited", message: "Too many", hint: "wait" },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    );
    await expect(fetchJsonOrThrow("/rate")).rejects.toMatchObject({
      status: 429,
      message: "Too many",
      code: "rate_limited",
      hint: "wait",
      meta: expect.objectContaining({ retry_after_secs: 60 }),
    } satisfies Partial<ApiError>);
  });

  it("handles nested { error: { ... } } structure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse({ error: { code: "bad_request", message: "Bad inner" } }, { status: 400 })
    );
    await expect(fetchJsonOrThrow("/nested")).rejects.toMatchObject({
      code: "bad_request",
      message: "Bad inner",
    } satisfies Partial<ApiError>);
  });

  it("handles legacy shape where error is a string", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse({ error: "Boom", code: "validation_failed" }, { status: 422 })
    );
    await expect(fetchJsonOrThrow("/legacy")).rejects.toMatchObject({
      message: "Boom",
      code: "validation_failed",
    } satisfies Partial<ApiError>);
  });

  it("throws 'Invalid JSON' when content-type is JSON but body is not parseable", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      textResponse("oops", { status: 200, headers: { "content-type": "application/json" } })
    );
    await expect(fetchJsonOrThrow("/bad-json")).rejects.toMatchObject({
      message: "Invalid JSON from backend",
      code: "upstream_error",
    } satisfies Partial<ApiError>);
  });

  it("throws 'Backend returned empty or non-JSON response' for non-JSON 200", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      textResponse("hi", { status: 200, headers: { "content-type": "text/plain" } })
    );
    await expect(fetchJsonOrThrow("/nonjson")).rejects.toMatchObject({
      message: "Backend returned empty or non-JSON response",
      code: "upstream_error",
    } satisfies Partial<ApiError>);
  });

  it("defaults to internal_error Backend error on plain 500", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      textResponse("error", { status: 500, headers: { "content-type": "text/plain" } })
    );
    await expect(fetchJsonOrThrow("/plain")).rejects.toMatchObject({
      status: 500,
      code: "internal_error",
      message: "Backend error",
    } satisfies Partial<ApiError>);
  });
});
