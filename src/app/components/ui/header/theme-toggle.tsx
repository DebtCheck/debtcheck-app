"use client";
import { useTheme } from "next-themes";
import { Button } from "../utilities";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const t = useTranslations("Header.Theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        className="px-3 py-1.5 text-sm border-border/15"
        disabled
      >
        {/* place holder stable pour l'hydratation */}
        <span className="opacity-0">Theme</span>
      </Button>
    );
  }
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      onClick={() => setTheme(next)}
      aria-label={t("toggleAria")}
      className="bg-transparent border border-border/15 hover:bg-foreground/10 text-foreground px-3 py-1.5 text-sm transition w-[100px]"
    >
      {theme === "dark" ? t("dark") : t("light")}
    </Button>
  );
}
