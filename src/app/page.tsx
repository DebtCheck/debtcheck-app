"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/utilities/base/card";
import { Input } from "./components/ui/utilities/base/input";
import { Button } from "./components/ui/utilities/buttons/button";
import GitHubAuth from "./components/ui/githubAuth";
import JiraAuth from "./components/ui/jira/jiraAuth";
import type { Report } from "@/app/types/report";
import { ReposPage } from "./components/dashboard/repos/page";
import { fetchJsonOrThrow } from "@/app/lib/http/rust-error";
import { ApiError } from "@/app/lib/http/response";
import { InlineAlert } from "./components/ui/utilities";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { useTheme } from "next-themes";
import { mapApiErrorToUi, UiError } from "./lib/http/ui-error";

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
    <main className="min-h-screen space-y-8">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/10">
        <div className="max-w-3xl mx-auto flex justify-between items-center pt-4 mb-4">
          <GitHubAuth />
          <ThemeToggle />
        </div>
      </div>

      {/* Analyze hero – keep this SINGLE source of truth for the URL input */}
      <section className="max-w-3xl mx-auto">
        <Card
          className="shadow-2xl backdrop-blur border [border-color:var(--border-10)] 
                   [background:var(--card-80)]"
        >
          <CardContent className="p-6 space-y-5">
            <h1 className="text-2xl md:text-3xl font-semibold text-center flex items-center justify-center gap-2">
              <Image
                src={logoSrc}
                alt="GitHub"
                width={28}
                height={28}
                priority
              />
              <span>Analyze a GitHub repo</span>
            </h1>

            <p className="[color:var(--muted-60)] text-center">
              Paste a repo URL and we’ll analyze the technical debt.
            </p>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading && isValidRepoUrl) void handleAnalyze();
              }}
            >
              <Input
                placeholder="https://github.com/user/your-repo"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  if (error) setError(null);
                }}
                className="flex-1 [background:rgb(var(--card))] 
                  [border-color:var(--border-10)] 
                  [color:rgb(var(--foreground))] 
                  placeholder:[color:var(--muted-60)] 
                  focus-visible:ring-[var(--primary-40)]"
              />
              <Button
                type="submit"
                disabled={loading || !isValidRepoUrl || cooldown > 0}
                className="cursor-pointer bg-[rgb(var(--foreground))] text-[rgb(var(--background))] hover:opacity-90 focus:ring-[var(--primary-40)]"
              >
                {cooldown > 0
                  ? `Retry in ${Math.ceil(cooldown)}s`
                  : loading
                  ? "Analyzing..."
                  : "Analyze"}
              </Button>
            </form>
            {(uiError || cooldown > 0) && (
              <InlineAlert
                variant={cooldown > 0 ? "warning" : uiError?.variant ?? "error"}
                title={
                  cooldown > 0
                    ? `You're hitting the anonymous GitHub quota. Sign in for a higher limit or wait ${Math.ceil(cooldown)}s and try again.`
                    : uiError!.title
                }
                description={cooldown > 0 ? undefined : uiError?.description}
                className="mt-3"
              />
            )}

            {withoutLog && (
              <InlineAlert
                variant="warning"
                title="You are analyzing without logging in."
                description="Some features may be limited. You won't be able to analyze private repositories. You'll be limited in the number of requests per hour."
                className="mt-3"
              />
            )}

            {result && (
              <>
                <Card className="border border-border/10 bg-card">
                  <CardContent>
                    <h2 className="text-lg font-semibold mb-2">
                      Analysis Result
                    </h2>
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
                <JiraAuth report={result} />
              </>
            )}
          </CardContent>
        </Card>
      </section>
      {!withoutLog && (
        <section className="max-w-5xl mx-auto">
          <ReposPage onSelectRepo={(url) => setRepoUrl(url)} />
        </section>
      )}
    </main>
  );
}
