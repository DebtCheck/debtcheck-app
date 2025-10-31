"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { latestReportMeta, timeAgo } from "@/app/lib/report-storage";
import { Button } from "./utilities";
import { useTranslations } from "next-intl";

export function LastReportButton() {
  const t = useTranslations("Home");
  const [meta, setMeta] = useState<ReturnType<typeof latestReportMeta>>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const read = () => setMeta(latestReportMeta());
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const open = () => {
    if (!meta) return;
    router.replace(`${pathname}?r=${encodeURIComponent(meta.id)}`, {
      scroll: false,
    });
  };

  const ago = meta ? timeAgo(meta.savedAt) : null;

  return (
    <Button
      onClick={open}
      disabled={!meta}
      className="rounded-full disabled:opacity-50"
      title={
        meta
          ? t("lastReportTitle", { ago: ago! })
          : t("lastReportNone")
      }
      aria-label={
        meta
          ? t("lastReportTitle", { ago: ago! })
          : t("lastReportNone")
      }
    >
      {meta ? (
        // e.g. "Last report: 2m ago" / "Dernier rapport : il y a 2m"
        <span>{t("lastReportPill", { ago: ago! })}</span>
      ) : (
        <span>{t("lastReportBtn")}</span>
      )}
    </Button>
  );
}