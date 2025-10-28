"use client";
import { useEffect, useRef, useState } from "react";
import type { GithubReposResponse, Repo } from "@/app/types/github";
import { Section } from "@/app/components/ui/utilities/base/section";
import { Toolbar } from "@/app/components/ui/utilities/base/toolbar";
import { Input } from "@/app/components/ui/utilities/base/input";
import { Button } from "@/app/components/ui/utilities/buttons/button";
import { InlineAlert } from "../ui/utilities";
import { RepoGallery } from "./repoGallery";
import { RepoPagination } from "./repoPagination";
import { useTranslations } from "next-intl";

const PER_PAGE = 10;

export function ReposPage({ onSelectRepo }: { onSelectRepo?: (url: string, repo?: Repo) => void }) {
  const t = useTranslations("Repos");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Repo[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

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

      const items = json.data ?? [];
      const next = typeof json.hasNext === "boolean" ? json.hasNext : items.length === PER_PAGE;

      setData(items);
      setHasNext(next);
      setStale(Boolean(json.stale));
      setPage(p);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("fetch repos error:", e);
      }
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  const filtered = query
    ? data.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase()))
    : data;

  return (
    <>
      <Section
        className="bg-card/80 border-border/10 mx-auto max-w-4xl p-4 shadow-2xl rounded-2xl"
        title={t("sectionTitle")}
        subtitle={t("sectionSubtitle")}
        actions={
          <Button onClick={() => load(page)} disabled={loading}>
            {t("refresh")}
          </Button>
        }
      >
        {stale && (
          <InlineAlert
            className="mb-3"
            variant="info"
            title={t("staleTitle")}
            description={t("staleDesc")}
          />
        )}

        <Toolbar
          className="mb-4"
          left={
            <Input
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
        />

        <RepoGallery items={filtered} loading={loading} onSelect={onSelectRepo} />

        <RepoPagination
          page={page}
          hasNext={hasNext}
          loading={loading}
          onPrev={() => load(page - 1)}
          onNext={() => load(page + 1)}
        />
      </Section>
    </>
  );
}