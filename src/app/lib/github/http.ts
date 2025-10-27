const GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_TIMEOUT_MS = 20_000;

export async function githubFetch(
  url: string,
  accessToken: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "your-app-name",
      ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
    };
    const res = await fetch(url, {
      ...init,
      headers: headers,
      cache: "no-store",
      signal: controller.signal,
    });

    let body;
    const text = await res.text();
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }

    if (!res.ok) {
      const err: Error & { status?: number; githubError?: unknown } = new Error(
        (body && body.message) || res.statusText
      );
      err.status = res.status;
      err.githubError = body;
      throw err;
    }

    return body;
  } finally {
    clearTimeout(t);
  }
}