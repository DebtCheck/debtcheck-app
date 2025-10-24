"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
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

export default function Home() {
  const { data: session } = useSession();
  const githubLinked = !!session?.providers?.github;

  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme(); // "light" | "dark"

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
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchJsonOrThrow<{ ok: true; data: Report }>(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl }),
        }
      );
      setResult(data.data);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        const hint = e.hint ? ` — ${e.hint}` : "";
        const code = e.code ? ` (${e.code})` : "";
        setError(`${e.message}${hint}${code}`);
      } else if (e instanceof Error) {
        setError(`Network error calling backend: ${e.message}`);
      } else {
        setError("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  if (!githubLinked) {
    // Show ONLY the auth gate when not linked
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <GitHubAuth />
      </main>
    );
  }

  const logoSrc =
    resolvedTheme === "dark"
      ? "/github-mark-white.svg"
      : "/github-mark-dark.svg";

  return (
    <main className="min-h-screen p-6 md:p-10 space-y-8">
      <div className="max-w-3xl mx-auto flex justify-end">
        <ThemeToggle />
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
              Paste a repo URL and we’ll analyze technical debt.
            </p>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Input
                placeholder="https://github.com/user/your-repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 [background:rgb(var(--card))] 
                     [border-color:var(--border-10)] 
                     [color:rgb(var(--foreground))] 
                     placeholder:[color:var(--muted-60)] 
                     focus-visible:ring-[var(--primary-40)]"
              />
              <Button
                onClick={handleAnalyze}
                type="submit"
                disabled={loading || !isValidRepoUrl}
                className="cursor-pointer bg-[rgb(var(--foreground))] 
                     text-[rgb(var(--background))] 
                     hover:opacity-90 
                     focus:ring-[var(--primary-40)]"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </form>
            {error && (
              <InlineAlert variant="error" title="Error" description={error} />
            )}

            {result && (
              <>
                <Card className="bg-neutral-800/70 border-white/10 text-gray-100">
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

      <GitHubAuth />

      <section className="max-w-5xl mx-auto">
        <ReposPage onSelectRepo={(url) => setRepoUrl(url)} />
      </section>
    </main>
  );
}
