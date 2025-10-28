"use client";

import { cn } from "@/app/lib/utils";
import { Repo } from "@/app/types/github";
import { Clock, GitBranch, Globe, Shield } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

function useTimeAgo() {
  const f = useFormatter();
  const now = useNow();

  return (iso: string): string => {
    return f.relativeTime(new Date(iso), { now });
  };
}

export type RepoCardProps = {
  repo: Repo;
  onSelect?: (url: string, repo: Repo) => void;
  className?: string;
  disabled?: boolean;
};

export function RepoCard({
  repo: r,
  onSelect,
  className,
  disabled,
}: RepoCardProps) {
  const t = useTranslations("Repos");
  const timeAgo = useTimeAgo();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(r.html_url, r)}
      aria-label={t("ariaChoose", { fullName: r.full_name })}
      className={cn(
        "text-left rounded-2xl border p-4 transition group",
        "cursor-pointer",
        "bg-card/5 hover:shadow-md hover:-translate-y-px",
        "border-border/10",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center overflow-hidden">
          {r.owner?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={r.owner.login}
              src={r.owner.avatar_url}
              className="h-full w-full object-cover"
            />
          ) : (
            <GitBranch className="h-4 w-4 opacity-70" />
          )}
        </div>

        {/* Texts */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium group-hover:underline cursor-pointer">
              {r.full_name}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] opacity-80 border-border/10">
              {r.private ? (
                <Shield className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {r.private ? t("privacyPrivate") : t("privacyPublic")}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs opacity-80">
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 border-border/10">
              {r.language ?? t("noLang")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t("pushed", { when: timeAgo(r.pushed_at) })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
