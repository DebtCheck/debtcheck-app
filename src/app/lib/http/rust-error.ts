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
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractRustError(body: RustErrorBody | null): {
  code: ApiErrorCode;
  message: string;
  hint: string | undefined;
  meta: Record<string, unknown> | undefined;
} {
  if (!body) {
    return {
      code: "internal_error",
      message: "Backend error",
      hint: undefined,
      meta: undefined,
    };
  }

  // If body.error is a STRING -> legacy/simple shape: treat as the message
  if (typeof body.error === "string") {
    return {
      code: (body.code ?? "internal_error") as ApiErrorCode,
      message: body.error,
      hint: body.hint,
      meta: body.meta,
    };
  }

  // Normal shapes: nested { error: {...} } OR flat top-level fields
  const src = (body.error ?? body) as RustErrorBody["error"];

  const message =
    (src && "message" in src && src.message) ||
    (typeof body.error === "string" ? body.error : undefined) ||
    "Backend error";

  return {
    code: ((src && "code" in src && src.code) ||
      body.code ||
      "internal_error") as ApiErrorCode,
    message,
    hint: (src && "hint" in src ? src.hint : undefined) ?? body.hint,
    meta: (src && "meta" in src ? src.meta : undefined) ?? body.meta,
  };
}

export async function fetchJsonOrThrow<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError("Request aborted", 499, {}, "upstream_error");
    }
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
  const ctype = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (res.status === 403 && text.includes("API rate limit exceeded")) {
      const reset = res.headers.get("X-RateLimit-Reset");
      const secs = reset
        ? Math.max(0, Math.ceil(parseInt(reset, 10) - Date.now() / 1000))
        : 60;
      // Normalize as 429 for your UI cooldown
      throw new ApiError(
        "GitHub rate limited (unauthenticated).",
        429,
        { raw: text },
        "rate_limited",
        "Sign in with GitHub for a higher quota or retry later.",
        { retry_after_secs: secs }
      );
    }

    const errParsed = extractRustError(asJson);
    // capture Retry-After if present
    const raSeconds = parseRetryAfter(res.headers.get("Retry-After"));
    const meta = {
      ...(errParsed.meta || {}),
      ...(raSeconds != null ? { retry_after_secs: raSeconds } : {}),
    };

    throw new ApiError(
      errParsed.message || `Backend error ${res.status}`,
      res.status,
      // Prefer parsed JSON error details if available, otherwise fall back to raw text
      asJson ?? text,
      errParsed.code,
      errParsed.hint,
      meta
    );
  }

  if (!asJson && ctype.includes("application/json")) {
    throw new ApiError(
      "Invalid JSON from backend",
      502,
      { raw: text, ctype },
      "upstream_error"
    );
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
  const d = Date.parse(v); // HTTP-date
  if (!Number.isNaN(d)) return Math.max(0, Math.round((d - Date.now()) / 1000));
}
