"use client";

import { Button } from "@/app/components/ui/utilities";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type Props = { fixed?: boolean };
export function Footer({ fixed = true }: Props) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();

  return (
    <footer
      className={[
        "fixed inset-x-0 bottom-0 z-40",
        "border-t border-(--line-06) py-1 sm:py-3",
        "bg-[rgb(var(--surface-1))/0.85] backdrop-blur supports-backdrop-filter:bg-[rgb(var(--surface-1))/0.7]",
        "text-xs text-[rgb(var(--color-foreground)/0.7)]"
      ].join(" ")}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 px-3">
        {/* Copyright (very small) */}
        <p className="text-[11px] opacity-70 select-none">
          © {new Date().getFullYear()} DebtCheck - Axel Gil
        </p>

        {/* Tiny buttons */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          <Button
            className="h-6 px-2 text-[11px] rounded-full hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
            onClick={() => router.push("/mentions-legales")}
          >
            {t("legal")}
          </Button>
          <Button
            className="h-6 px-2 text-[11px] rounded-full hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
            onClick={() => router.push("/mentions-legales/cgu")}
          >
            {t("cgu")}
          </Button>
          <Button
            className="h-6 px-2 text-[11px] rounded-full hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
            onClick={() => router.push("/mentions-legales/confidentialite")}
          >
            {t("privacy")}
          </Button>
        </div>
      </div>
    </footer>
  );
}
