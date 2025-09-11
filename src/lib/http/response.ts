import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err.message, err.status, err.details);
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
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}