import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "upstream_error"
  | "timeout"
  | "internal_error";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        hint: err.hint,
        meta: err.meta,
        details: err.details,
      },
      { status: err.status }
    );
  }
  return jsonError("Unexpected error", 500);
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public details?: unknown,
    public code: ApiErrorCode = "internal_error",
    public hint?: string,
    public meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}