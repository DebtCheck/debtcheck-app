"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import GitHubAuth from "./components/ui/githubAuth";
import ConnectJiraButton, { DisconnectJiraButton } from "./components/ui/jira/jiraAuth";
import JiraProjects from "./components/ui/jira/jiraProjects";
import type { Report } from "@/types/report";
import type { Projects } from "@/types/jira";

export default function Home() {
  const { data: session, status } = useSession();

  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);

  const [jiraProjects, setJiraProjects] = useState<Projects | null>(null);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jiraLinked = !!session?.providers?.jira; // <-- new flag from session callback

  const handleProjects = useCallback(async () => {
    if (!jiraLinked) return;

    setLoadingProjects(true);
    setError(null);
    setJiraProjects(null);

    try {
      const res = await fetch("/api/jira/projects", { method: "GET", cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        // data is likely { error: "message" } – pick a string
        setError(typeof data?.error === "string" ? data.error : "Failed to fetch Jira projects");
        return; // <- do NOT setJiraProjects on error
      }

      setJiraProjects(data as Projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoadingProjects(false);
    }
  }, [jiraLinked]);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json();
      setResult(data);

      // If Jira is linked, refresh projects after analyze (optional)
      if (jiraLinked) {
        await handleProjects();
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [repoUrl, jiraLinked, handleProjects]);

  // Fetch Jira projects once per session (and when user links Jira)
  useEffect(() => {
    if (status === "authenticated" && jiraLinked && !hasFetchedProjects) {
      handleProjects().finally(() => setHasFetchedProjects(true));
    }
    // Reset flag if user logs out or unlinks
    if (status !== "authenticated" || !jiraLinked) {
      setHasFetchedProjects(false);
      setJiraProjects(null);
    }
  }, [status, jiraLinked, hasFetchedProjects, handleProjects]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
            <Image src="/github.svg" alt="DebtCheck Logo" width={40} height={40} />
          </h1>
          <p className="text-center text-gray-600">
            Drop your GitHub repo URL and we&apos;ll analyze it for technical debt.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="https://github.com/user/your-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 placeholder-gray-500 text-gray-600"
            />
            <Button onClick={handleAnalyze} disabled={loading || !repoUrl}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          {result && (
            <div className="mt-4 text-gray-600 border rounded p-4">
              <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <GitHubAuth />

      <div className="p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Jira Integration</h2>

        {status === "loading" && <p className="text-gray-500">Checking session…</p>}

        {status === "authenticated" && !jiraLinked && (
          <>
            <ConnectJiraButton />
            <p className="text-gray-600 mt-2">
              Connect your Jira account to track issues and technical debt.
            </p>
          </>
        )}

        {status === "authenticated" && jiraLinked && (
          <>
            {loadingProjects && <p className="text-gray-500 mt-4">Loading projects…</p>}
            {!loadingProjects && jiraProjects && Array.isArray(jiraProjects.values) ? (
              jiraProjects.values.length > 0 ? (
                <JiraProjects values={jiraProjects.values} report={result} />
              ) : (
                <p className="text-gray-600 mt-4">You have no Jira projects available.</p>
              )
            ) : null}
            <DisconnectJiraButton />
          </>
        )}

        {status === "unauthenticated" && (
          <Button className="mt-2" onClick={() => signIn(undefined, { callbackUrl: window.location.href })}>
            Sign in to continue
          </Button>
        )}
      </div>
    </main>
  );
}