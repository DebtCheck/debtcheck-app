import { ApiError, ApiErrorCode } from "./response";

type RustErrorBody = {
  code?: ApiErrorCode;
  message?: string;
  hint?: string;
  meta?: Record<string, unknown>;
  // some versions might nest it under { error: {...} } – we’ll handle both
  error?: {
    code?: ApiErrorCode;
    message?: string;
    hint?: string;
    meta?: Record<string, unknown>;
  };
};

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}

function isApiCode(v: ApiErrorCode | undefined): v is ApiErrorCode {
  return typeof v === "string" && [
    "bad_request","validation_failed","unauthorized","forbidden",
    "not_found","rate_limited","upstream_error","timeout","internal_error",
  ].includes(v);
}

function extractRustError(body: RustErrorBody | null) {
  const src = (body?.error ?? body) ?? {};
  const code = isApiCode(src.code) ? src.code : "internal_error";
  return { code, message: src.message ?? "Backend error", hint: src.hint, meta: src.meta };
}

export async function fetchJsonOrThrow<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "unknown";
    throw new ApiError(
      `Network error calling backend: ${errorMessage}`,
      502,
      { cause: e },
      "upstream_error"
    );
  }

  const text = await res.text();
  const asJson = text ? safeJson(text) : null;

  if (!res.ok) {
    const errParsed = extractRustError(asJson);
    // capture Retry-After if present
    const raSeconds = parseRetryAfter(res.headers.get("Retry-After"));
    const meta = { ...(errParsed.meta||{}), ...(raSeconds!=null ? { retry_after_secs: raSeconds } : {}) };

    throw new ApiError(
      errParsed.message || `Backend error ${res.status}`,
      res.status,
      asJson ?? text,                 // keep raw body in details for debugging
      errParsed.code,
      errParsed.hint,
      meta
    );
  }

  const ctype = res.headers.get("content-type") || "";
  if (!asJson && ctype.includes("application/json")) {
    throw new ApiError("Invalid JSON from backend", 502, { raw: text, ctype }, "upstream_error");
  }

  if (!asJson) {
    throw new ApiError(
      "Backend returned empty or non-JSON response",
      502,
      { raw: text },
      "upstream_error"
    );
  }

  return asJson as T;
}

function parseRetryAfter(v: string | null): number | undefined {
  if (!v) return;
  const n = Number(v);
  if (Number.isFinite(n)) return n; // delta-seconds
  const d = Date.parse(v);          // HTTP-date
  if (!Number.isNaN(d)) return Math.max(0, Math.round((d - Date.now()) / 1000));
}
