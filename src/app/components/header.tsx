"use client";

import GitHubAuth from "./ui/header/githubAuth";
import { Button } from "./ui/utilities";
import { Sparkles, User } from "lucide-react";
import { LocaleDropdown } from "./ui/header/lang/localeDropdown";
import { ThemeToggle } from "./ui/header/theme-toggle";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function Header() {
  const tHead = useTranslations("Header");
  const router = useRouter();

  return (
    <header className="fixed inset-x-0 top-0 z-300 bg-background/80 backdrop-blur border-b border-(--line-06) h-(--appbar-h)">
      <div className="max-w-5xl mx-auto flex justify-between items-center h-full px-4">
        <GitHubAuth />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/about/features")}
            className="px-3 py-1.5 text-sm bg-transparent hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
          >
            <Sparkles className="size-4 mr-1" />
            {tHead("features")}
          </Button>
          <Button
            onClick={() => router.push("/about")}
            className="px-3 py-1.5 text-sm bg-transparent hover:bg-[rgb(var(--color-primary))/10] text-[rgb(var(--color-primary))]"
          >
            <User className="size-4 mr-1" />
            {tHead("about")}
          </Button>
          <LocaleDropdown />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
