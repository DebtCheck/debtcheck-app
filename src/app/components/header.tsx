"use client";
import GitHubAuth from "./ui/header/githubAuth";
import { Button } from "./ui/utilities";
import { Sparkles, User, Menu, Scale } from "lucide-react";
import { LocaleDropdown } from "./ui/header/lang/localeDropdown";
import { ThemeToggle } from "./ui/header/theme-toggle";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

export function Header() {
  const t = useTranslations("Header");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const el = document.documentElement;
    if (open) el.classList.add("overflow-hidden");
    else el.classList.remove("overflow-hidden");
    return () => el.classList.remove("overflow-hidden");
  }, [open]);

  return (
    <header
      className="
    fixed inset-x-0 top-0 z-300
    bg-background/80 backdrop-blur border-b border-(--line-06)
    h-(--header-h-mobile) sm:h-(--header-h-desktop)
    pt-[env(safe-area-inset-top)]
  "
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between h-full px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Logo → navigate to "/" */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 sm:gap-2 hover:opacity-80 transition cursor-pointer shrink-0"
          >
            <div className="relative h-8 w-8 sm:h-[50px] sm:w-[50px]">
              <Image
                src="/icon0.svg"
                alt="DebtCheck Logo"
                fill
                priority
                className="object-contain select-none pointer-events-none"
              />
            </div>
            <span className="font-semibold text-sm sm:text-base hidden sm:inline leading-none">
              DebtCheck
            </span>
          </button>

          {/* Keep this from growing the row */}
          <div className="shrink-0">
            <GitHubAuth />
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            onClick={() => router.push("/about/features")}
            className="px-3 py-1.5 text-sm bg-transparent hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
          >
            <Sparkles className="size-4 mr-1" />
            {t("features")}
          </Button>
          <Button
            onClick={() => router.push("/about")}
            className="px-3 py-1.5 text-sm bg-transparent hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
          >
            <User className="size-4 mr-1" />
            {t("about")}
          </Button>
          <LocaleDropdown />
          <ThemeToggle />
        </div>

        {/* Mobile */}
        <div className="sm:hidden shrink-0">
          <Button
            aria-label="Open menu"
            className="px-2 py-1.5 bg-transparent hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
            onClick={() => setOpen((s) => !s)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-400">
            {/* scrim */}
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/35 dark:bg-black/45 backdrop-blur-sm"
            />

            {/* FULL overlay panel that also covers the header */}
            <div
              className="
        absolute inset-x-0
        top-[clamp(16px,8vh,30px)]
        px-3
      "
            >
              <div
                className="
          mx-auto w-full max-w-7xl
          rounded-2xl border border-(--line-06)
          bg-[rgb(var(--surface-1))] text-[rgb(var(--color-foreground))]
          shadow-2xl
        "
              >
                <div className="px-3 py-2 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      setOpen(false);
                      router.push("/about/features");
                    }}
                  >
                    <Sparkles className="size-4 mr-1" /> {t("features")}
                  </Button>
                  <Button
                    onClick={() => {
                      setOpen(false);
                      router.push("/about");
                    }}
                  >
                    <User className="size-4 mr-1" /> {t("about")}
                  </Button>
                  <LocaleDropdown />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
