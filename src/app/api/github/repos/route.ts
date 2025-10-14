import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { ensureFreshGithubAccessToken } from "@/lib/github/github";
import { getServerSession } from "next-auth";
import { jsonError } from "@/lib/http/response";
import { authOptions } from "@/lib/auth/auth";

type CacheValue<T = unknown> = 
  { 
    etag?: string; 
    payload: T; 
    fetchedAt: number;
    hasNext: boolean;
  };

export const runtime = "nodejs";

const FRESH_MS = 10 * 60 * 1000;   // 10 min frais
const REDIS_TTL_S = 60 * 60;       // 1 h en KV

function key(userId: string, page: number, perPage: number) {
  return `dc:repos:v1:user:${userId}:page:${page}:per:${perPage}`;
}

function hasNextFromLinkHeader(link: string | null, fallback: boolean) {
  if (!link) return fallback;
  return link.split(",").some(part => /rel="next"/.test(part));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const perPage = 10;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId)
    return jsonError("Unauthorized", 401);
  
  let accessToken: string;
  try {
    ({ accessToken } = await ensureFreshGithubAccessToken(userId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GitHub not linked";
    return jsonError(msg, 401);
  }

  const cacheKey = key(userId, page, perPage);
  const cached = (await kv.get<CacheValue<unknown[]>>(cacheKey)) || null;

  // 1) si cache frais -> renvoyer direct
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
    return NextResponse.json({
      data: cached.payload,
      stale: false,
      page,
      hasNext: cached.hasNext,
      source: "cache",
    });
  }

  // 2) requête conditionnelle si ETag
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
  };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;

  const ghUrl = `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=pushed`;
  const res = await fetch(ghUrl, { headers });

  if (res.status === 304 && cached) {
    const link = res.headers.get("link");
    const hasNext = hasNextFromLinkHeader(link, cached.hasNext);
    const fresh = { ...cached, fetchedAt: Date.now(), hasNext };
    await kv.set(cacheKey, fresh, { ex: REDIS_TTL_S });
    return NextResponse.json({
      data: fresh.payload,
      stale: false,
      page,
      hasNext: hasNextFromLinkHeader(res.headers.get("link"), hasNext),
      source: "kv-304",
    });
  }

  if (res.ok) {
    const data = await res.json();
    const etag = res.headers.get("etag") ?? undefined;
    const link = res.headers.get("link");
    const hasNext = hasNextFromLinkHeader(link, data.length === perPage);
    const toStore: CacheValue = { etag, payload: data, fetchedAt: Date.now(), hasNext };
    await kv.set(cacheKey, toStore, { ex: REDIS_TTL_S });
    return NextResponse.json({
      data,
      stale: false,
      page,
      hasNext: hasNextFromLinkHeader(res.headers.get("link"), hasNext),
      source: "github-200",
    });
  }

  // 3) fallback stale si rate-limited/erreur
  if (cached) {
    return NextResponse.json({
      data: cached.payload,
      stale: true,
      page,
      hasNext: false,
      source: "kv-stale",
    });
  }

  return NextResponse.json({ error: "GitHub API error", status: res.status }, { status: 502 });
}