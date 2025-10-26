"use client";
import { useTheme } from "next-themes";
import { Button } from "./utilities";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      onClick={() => setTheme(next)}
      aria-label="Toggle theme"
      className="bg-transparent border border-border/15 hover:bg-foreground/10 text-foreground px-3 py-1.5 text-sm transition"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </Button>
  );
}
