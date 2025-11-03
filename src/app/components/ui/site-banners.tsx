"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useIsMobile } from "../hooks/useIsMobile";

type BannerProps = {
  id: string;                 // clé de persistance
  className?: string;
  children: React.ReactNode;
};

function DismissableBanner({ id, className, children }: BannerProps) {
  const key = `banner:dismissed:${id}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(localStorage.getItem(key) !== "1");
  }, [key]);

  if (!open) return null;
  return (
    <div
      role="status"
      className={clsx(
        "w-full border border-(--line-neutral-20) bg-[rgb(var(--surface-2))]/80 backdrop-blur px-3 sm:px-4 py-2 text-xs sm:text-sm",
        "flex items-start sm:items-center justify-between gap-3 z-320000000",
        className
      )}
    >
      <div className="text-foreground/90">{children}</div>
      <button
        onClick={() => {
          localStorage.setItem(key, "1");
          setOpen(false);
        }}
        className="shrink-0 rounded-md border border-border/30 px-2 py-1 hover:bg-foreground/10"
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}

export function SiteBanners({
  showUnderConstruction,
  showMobileAdvice,
  extra,
}: {
  showUnderConstruction?: boolean;
  showMobileAdvice?: boolean;
  extra?: React.ReactNode; // pour ajouter des bandeaux spécifiques à une page
}) {
  const t = useTranslations("Banners");
  const isMobile = useIsMobile();

  return (
    <div className="mb-2">
      {showUnderConstruction && (
        <DismissableBanner id="wip">
          <strong>⚠️ {t("wip.title")}</strong> {t("wip.desc")}
        </DismissableBanner>
      )}

      {showMobileAdvice && isMobile && (
        <DismissableBanner id="mobile">
          <strong>📱 {t("mobile.title")}</strong> {t("mobile.desc")}
        </DismissableBanner>
      )}

      {extra}
    </div>
  );
}