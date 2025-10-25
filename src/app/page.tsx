"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "./components/ui/utilities/base/card";
import { Input } from "./components/ui/utilities/base/input";
import { Button } from "./components/ui/utilities/buttons/button";
import GitHubAuth from "./components/ui/githubAuth";
import JiraAuth from "./components/ui/jira/jiraAuth";
import type { Report } from "@/app/types/report";
import { ReposPage } from "./components/repos/page";
import { fetchJsonOrThrow } from "@/app/lib/http/rust-error";
import { ApiError } from "@/app/lib/http/response";
import { AnalyzeHero, InlineAlert } from "./components/ui/utilities";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { useTheme } from "next-themes";
import { mapApiErrorToUi, UiError } from "./lib/http/ui-error";
import DebtCheckReportView from "./components/report/page";
import router from "next/router";
import { ChevronLeft } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const githubLinked = !!session?.providers?.github;

  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withoutLog, setWithoutLog] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [uiError, setUiError] = useState<UiError | null>(null);
  const { resolvedTheme } = useTheme(); // "light" | "dark"
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (githubLinked && withoutLog) setWithoutLog(false);
  }, [githubLinked, withoutLog]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const isValidRepoUrl = useMemo(() => {
    // lightweight GH repo URL check: owner/repo, optional trailing parts ignored
    try {
      const u = new URL(repoUrl);
      return u.hostname === "github.com" && /^\/[^/]+\/[^/]+/.test(u.pathname);
    } catch {
      return false;
    }
  }, [repoUrl]);

  const handleAnalyze = useCallback(async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setUiError(null);
    setResult(null);

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const data = await fetchJsonOrThrow<{ ok: true; data: Report }>(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoUrl,
            demo: !githubLinked || withoutLog, // <-- add this
          }),
          signal: controller.signal,
        }
      );
      setResult(data.data);
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = mapApiErrorToUi(err, {
          githubLinked,
          startCooldown: (secs) => setCooldown(secs),
        });
        setUiError(mapped);
      } else if (err instanceof Error) {
        setUiError({
          variant: "error",
          title: "Network error",
          description: err.message,
        });
      } else {
        setUiError({ variant: "error", title: "Unexpected error" });
      }
    } finally {
      setLoading(false);
    }
  }, [cooldown, repoUrl, githubLinked, withoutLog]);

  const handleWithoutLog = () => {
    setWithoutLog(true);
  };

  if (!githubLinked && !withoutLog) {
    // Show ONLY the auth gate when not linked
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <GitHubAuth />
        <Button onClick={handleWithoutLog} className="ml-4">
          {withoutLog ? "Continue without login…" : "Continue without login"}
        </Button>
      </main>
    );
  }

  const logoSrc =
    resolvedTheme === "dark"
      ? "/github-mark-white.svg"
      : "/github-mark-dark.svg";

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/10">
        <div className="max-w-3xl mx-auto flex justify-between items-center pt-4 mb-4">
          <GitHubAuth />
          <ThemeToggle />
        </div>
      </div>
      {!result && (
        <main className="min-h-screen space-y-8 mt-5">
          {/* Analyze hero – keep this SINGLE source of truth for the URL input */}
          <section className="max-w-3xl mx-auto">
            <Card className="shadow-2xl backdrop-blur border [border-color:var(--border-10)] [background:var(--card-80)]">
              <CardContent className="p-6 space-y-5">
                <h1 className="text-2xl md:text-3xl font-semibold text-center flex items-center justify-center gap-2">
                  <Image
                    src={logoSrc}
                    alt="GitHub Logo"
                    width={28}
                    height={28}
                    priority
                  />
                  <span className="text-2xl md:text-3xl font-semibold text-center">
                    Analyze a GitHub repo
                  </span>
                </h1>

                <div className="flex-1">
                  <AnalyzeHero
                    variant="header"
                    size="sm" // or "md" for taller
                    value={repoUrl}
                    onChange={setRepoUrl}
                    onAnalyze={() => {
                      if (!loading && isValidRepoUrl) void handleAnalyze();
                    }}
                    loading={loading}
                    disabled={!isValidRepoUrl || cooldown > 0}
                    ctaLabel={
                      cooldown > 0
                        ? `Retry in ${Math.ceil(cooldown)}s`
                        : "Analyze"
                    }
                    loadingLabel="Analyzing…"
                    showIcon
                  />
                </div>

                {/* keep your auth notices */}
                {(uiError || cooldown > 0) && (
                  <InlineAlert
                    variant={
                      cooldown > 0 ? "warning" : uiError?.variant ?? "error"
                    }
                    title={
                      cooldown > 0
                        ? `You're hitting the anonymous GitHub quota. Sign in or wait ${Math.ceil(
                            cooldown
                          )}s.`
                        : uiError!.title
                    }
                    description={
                      cooldown > 0 ? undefined : uiError?.description
                    }
                    className="mt-3"
                  />
                )}

                {withoutLog && (
                  <InlineAlert
                    variant="warning"
                    title="You are analyzing without logging in."
                    description="Some features may be limited (private repos disabled, 60 reqs/hr)."
                    className="mt-3"
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {!withoutLog && (
            <section className="max-w-5xl mx-auto">
              <ReposPage onSelectRepo={(url) => setRepoUrl(url)} />
            </section>
          )}
          {!withoutLog && (
            <section className="max-w-5xl mx-auto">
              <ReposPage onSelectRepo={(url) => setRepoUrl(url)} />
            </section>
          )}
        </main>
      )}
      {result && (
        <>
          <Button className="mt-4 ml-4" onClick={() => setResult(null)}>
            <ChevronLeft></ChevronLeft>
          </Button>
          <DebtCheckReportView report={result} />
        </>
      )}
    </>
  );
}
