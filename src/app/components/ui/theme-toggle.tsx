"use client";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setTheme(next)}
      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-card/80
                 cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-primary/40 ring-offset-background
                 focus:ring-offset-2 transition"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}