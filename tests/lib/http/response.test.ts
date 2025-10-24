import { describe, it, expect } from "vitest";
import { jsonError, jsonOk, ApiError, toErrorResponse } from "@/lib/http/response";
import { NextResponse } from "next/server";

describe("lib/http/response", () => {
  it("jsonError returns NextResponse with error structure", async () => {
    const res = jsonError("Bad Request", 400, { field: "email" });

    // Verify it's a NextResponse
    expect(res).toBeInstanceOf(NextResponse);

    const data = await res.json();
    expect(data).toEqual({
      error: "Bad Request",
      details: { field: "email" },
    });
    expect(res.status).toBe(400);
  });

  it("jsonOk returns NextResponse with data payload", async () => {
    const payload = { ok: true, msg: "done" } as const;
    const res = jsonOk(payload);

    expect(res).toBeInstanceOf(NextResponse);
    const data = await res.json();
    expect(data).toEqual(payload);
    expect(res.status).toBe(200);
  });

  it("ApiError keeps message, status, and details", () => {
    const err = new ApiError("Missing token", 401, { path: "/auth" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("Missing token");
    expect(err.status).toBe(401);
    expect(err.details).toEqual({ path: "/auth" });
  });

  it("toErrorResponse returns jsonError for ApiError", async () => {
    const err = new ApiError("Not found", 404, { id: "42" });
    const res = toErrorResponse(err);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({
      error: "Not found",
      code: "internal_error",
      details: { id: "42" },
    });
  });

  it("toErrorResponse returns generic 500 for unknown errors", async () => {
    const res = toErrorResponse(new Error("something broke"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Unexpected error");
  });

  it("jsonError defaults to status 400 when not specified", async () => {
    const res = jsonError("Invalid");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid");
  });
});