"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class" // Adds `class="dark"` or `class="light"` on <html>
        defaultTheme="dark" // Start in dark mode
        enableSystem={false} // Ignore OS preference (set true if you want auto)
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
