"use client";

import React, { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "../utilities/buttons/button";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

export default function GitHubAuth() {
  const t = useTranslations("Header.Auth");
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
        setBusy(false);
      }
    } catch (err) {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/github", { method: "DELETE" });
      if (!res.ok) {
        setBusy(false);
        return;
      }

      localStorage.removeItem("report");
      sessionStorage.removeItem("report");
      window.location.assign("/");
    } catch (e) {
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
          alt="GitHub"
          width={20}
          height={20}
          className="invert-0 dark:invert"
        />
        <span>{busy ? t("continueBusy") : t("continue")}</span>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-sm text-foreground">
      <div className="flex items-center gap-2">
        <Image
          src={session.user?.image || logoSrc}
          alt={t("avatarAlt")}
          width={28}
          height={28}
          className="rounded-full"
        />
        <p className="font-medium">{session.user?.name || t("githubUserFallback")}</p>
      </div>

      <Button
        onClick={disconnect}
        disabled={busy}
        className="bg-transparent border border-border/15 hover:bg-foreground/10 text-foreground"
      >
        {busy ? t("disconnectBusy") : t("disconnect")}
      </Button>
    </div>
  );
}
