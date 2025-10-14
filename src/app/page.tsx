"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import GitHubAuth from "./components/ui/githubAuth";
import { useCallback, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import JiraAuth from "./components/ui/jira/jiraAuth";
import type { Report } from "@/types/report";
import ReposPage from "./components/dashboard/repos/page";


export default function Home() {

  const { data: session } = useSession();
  const githubLinked = !!session?.providers?.github;

  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
      {/*  */}
      {!githubLinked ? (
        <GitHubAuth />
      ) : (
        <>
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
                <>
                  <div className="mt-4 text-gray-600 border rounded p-4">
                    <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                  </div>

                  <div className="p-6 w-full max-w-2xl">
                    <h2 className="text-xl font-bold mb-4">Jira Integration</h2>

                    <JiraAuth report={result} />
                  </div>
                </>
                
              )}

              {error && (
                <div className="mt-2 text-sm text-red-600">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
          <GitHubAuth />
          <ReposPage onSelectRepo={(url) => setRepoUrl(url)}/>
        </>
      )

      }
    </main>
  );
}