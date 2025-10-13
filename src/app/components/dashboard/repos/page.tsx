"use client";
import { Repo } from "@/types/github";
import { useEffect, useState } from "react";

type ApiResponse = {
  data: Repo[];
  hasNext: boolean;
  stale: boolean;
  source?: string;
  page: number;
};

export default function ReposPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Repo[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(p = 1) {
    setLoading(true);

    try {
      const res = await fetch(`/api/github/repos?page=${p}`, { cache: "no-store" });
      const json: ApiResponse = await res.json();

      setData(json.data || []);
      setHasNext(Boolean(json.hasNext));
      setStale(Boolean(json.stale));
      setPage(p);
    } catch (err) {
      console.error("Erreur lors du chargement des dépôts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  return (
    <div className="p-4 space-y-4">

      {/* --- Titre --- */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Mes dépôts GitHub</h1>
        {stale && (
          <span className="text-xs rounded px-2 py-1 border bg-yellow-50 text-yellow-800">
            cache (potentiellement périmé)
          </span>
        )}
      </div>

      {/* --- Liste --- */}
      {loading && <div>Chargement…</div>}
      <ul className="space-y-2">
        {data.map((r) => (
          <li key={r.id} className="border rounded p-3 hover:shadow-sm transition">
            <a
              href={r.html_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
            >
              {r.full_name}
            </a>{" "}
            {r.private ? <span className="text-xs text-gray-600">• privé</span> : null}
            <div className="text-sm text-gray-500">
              {r.language ?? "No lang"} • pushed{" "}
              {new Date(r.pushed_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>

      {/* --- Pagination --- */}
      <div className="flex gap-2 pt-4">
        <button
          disabled={page <= 1 || loading}
          onClick={() => load(page - 1)}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          ← Précédent
        </button>
        <button
          disabled={!hasNext || loading}
          onClick={() => load(page + 1)}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
