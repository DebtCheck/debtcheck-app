"use client";
import { GithubReposResponse, Repo } from "@/types/github";
import { ChevronLeft, ChevronRight, Clock, GitBranch, Globe, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} j`;
  const months = Math.round(days / 30);
  return `${months} mois`;
}

export function ReposPage({ onSelectRepo }: { onSelectRepo?: (url: string, repo?: Repo) => void;}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Repo[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);

  const PER_PAGE = 10;

  const controllerRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  async function load(p = 1) {
    const myId = ++reqIdRef.current;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setLoading(true);
      const r = await fetch(`/api/github/repos?page=${p}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const json: GithubReposResponse = await r.json();

      if (myId !== reqIdRef.current) return;

      const data = json.data ?? [];
      const hasNext =
        (typeof json.hasNext === "boolean" ? json.hasNext : data.length === PER_PAGE);

      setData(data);
      setHasNext(hasNext);
      setStale(Boolean(json.stale));
      setPage(p);
    } catch (e) {
      if (typeof e === "object" && e !== null && "name" in e && (e as { name?: string }).name !== "AbortError") {
        console.error("fetch repos error:", e);
      }
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  return (
    <div className="mx-auto max-w-4xl p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Mes dépôts GitHub</h2>
        {stale && (
          <span className="text-xs rounded-full border px-3 py-1 opacity-80">
            cache (peut être périmé)
          </span>
        )}
      </div>

      {/* Grid / Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border bg-white/5 animate-pulse" />
            ))
          : data.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRepo?.(r.html_url, r)}
                className="text-left rounded-2xl border p-4 hover:shadow-md hover:-translate-y-[1px] transition group bg-white/5"
                aria-label={`Choisir ${r.full_name}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar (fallback si absent) */}
                  <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                    {r.owner?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={r.owner.login} src={r.owner.avatar_url} className="h-full w-full object-cover" />
                    ) : (
                      <GitBranch className="h-4 w-4 opacity-70" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium group-hover:underline cursor-pointer">{r.full_name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] opacity-80">
                        {r.private ? <Shield className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {r.private ? "privé" : "public"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        {r.language ?? "No lang"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        pushed {timeAgo(r.pushed_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
      </div>

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="mt-10 rounded-2xl border p-8 text-center opacity-80">
          Aucun dépôt à afficher ici.
        </div>
      )}

      {/* Pagination bar */}
      <div className="sticky bottom-3 mt-6 flex items-center justify-between rounded-2xl border bg-white/5 p-2 backdrop-blur">
        <button
          disabled={page <= 1 || loading}
          onClick={() => load(page - 1)}
          className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </button>
        <span className="text-sm opacity-80">Page {page}</span>
        <button
          disabled={!hasNext || loading}
          onClick={() => load(page + 1)}
          className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 disabled:opacity-50"
        >
          Suivant <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
