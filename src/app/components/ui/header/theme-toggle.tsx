"use client";
import { useTheme } from "next-themes";
import { Button } from "../utilities";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const t = useTranslations("Header.Theme");
  const { theme, setTheme } = useTheme();
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
