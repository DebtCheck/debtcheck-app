import * as React from "react";
import type { Repo } from "@/app/types/github";
import { RepoListSkeleton } from "./repoListSkeleton";
import { RepoCard } from "./repoCard";
import { useTranslations } from "next-intl";

export type RepoGalleryProps = {
  items: Repo[];
  loading?: boolean;
  onSelect?: (url: string, repo?: Repo) => void;
};

export function RepoGallery({ items, loading, onSelect }: RepoGalleryProps) {
  const t = useTranslations("Repos");
  if (loading) return <RepoListSkeleton />;
  if (!loading && items.length === 0)
    return (
      <div className="mt-10 rounded-2xl border p-8 text-center opacity-80 border-border/10 bg-card">
        {t("empty")}
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((r) => (
        <RepoCard key={r.id} repo={r} onSelect={onSelect} />
      ))}
    </div>
  );
}
