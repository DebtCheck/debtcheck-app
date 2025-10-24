"use client";

import React, { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "./utilities/buttons/button";
import { useTheme } from "next-themes";

export default function GitHubAuth() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);

  const { resolvedTheme } = useTheme();
  const logoSrc =
    resolvedTheme === "dark"
      ? "/github-mark-white.svg"
      : "/github-mark-dark.svg";

  if (status === "loading") return null;
  const githubLinked = !!session?.providers?.github;

  const handleLogin = async () => {
    try {
      setBusy(true);
      const res = await signIn("github", {
        callbackUrl: "/",
        redirect: false,
      });

      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      if (res?.error) {
        console.error("GitHub sign-in failed:", res.error);
        setBusy(false);
      }
    } catch (err) {
      console.error("GitHub sign-in threw:", err);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/github", { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to disconnect GitHub:", await res.text());
        setBusy(false);
        return;
      }

      window.location.assign("/"); // or a dedicated /auth page
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  if (!githubLinked) {
    return (
      <Button
        onClick={handleLogin}
        className="flex items-center gap-2 bg-[#24292f] hover:bg-[#1b1f23] text-white"
      >
        <Image
          src={logoSrc}
          alt="GitHub Logo"
          width={20}
          height={20}
          className="invert-0 dark:invert"
        />
        <span>
          {busy ? "Continuing with GitHub..." : "Continue with GitHub"}
        </span>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-sm text-foreground">
      <div className="flex items-center gap-2">
        <Image
          src={session.user?.image || logoSrc}
          alt="Avatar"
          width={28}
          height={28}
          className="rounded-full"
        />
        <p className="font-medium">{session.user?.name || "GitHub User"}</p>
      </div>

      <Button
        onClick={disconnect}
        disabled={busy}
        className="bg-transparent border border-border/15 hover:bg-foreground/10 text-foreground"
      >
        {busy ? "Disconnecting…" : "Disconnect GitHub"}
      </Button>
    </div>
  );
}
