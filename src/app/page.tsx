"use client"
import Image from "next/image"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import { Report } from "@/types/report";
import { useEffect, useState } from "react"
import GitHubAuth from "./components/ui/githubAuth"
import ConnectJiraButton from "./components/ui/jiraAuth"
import { useSession } from "next-auth/react"
import JiraProjects from "./components/ui/jiraProjects"
import { Projects } from "@/types/jira"

export default function Home() {

  const session = useSession();

  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [, setError] = useState<unknown>(null);

  const [jiraProjects, setJiraProjects] = useState<Projects | null>(null)
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
  const [, setLoadingProjects] = useState(false)

  const handleAnalyze = async () => {
    setLoading(true);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl }),
    })

    const data = await response.json();
    setResult(data);
    handleProjects();
    setLoading(false);
  }

  const handleProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    setJiraProjects(null);

    try {
      const res = await fetch("/api/jira/projects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      

      if (!res.ok) {
        setError(data);
      } else {
        setJiraProjects(data);
      }
    } catch (e) {
      setError({ error: "Unexpected error", details: e });
    } finally {
      setLoadingProjects(false);
    }
  };
  
  useEffect(() => {
    if (session.data?.jiraAccessToken && !hasFetchedProjects) {
      handleProjects();
      setHasFetchedProjects(true);
    }
  }, [session.data?.jiraAccessToken, hasFetchedProjects]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
            <Image
              src="/github.svg"
              alt="DebtCheck Logo"    
              width={40}
              height={40} 
            />
          </h1>
          <p className="text-center text-gray-600">
            Drop your GitHub repo URL and we&apos;ll analyze it for technical debt.
          </p>
            <div className="flex gap-2">
            <Input
              placeholder="https://github.com/user/your-repo"
              value={repoUrl}
              onChange={(e: { target: { value: string } }) => setRepoUrl(e.target.value)}
              className="flex-1 placeholder-gray-500 text-gray-600"
            />
            <Button onClick={handleAnalyze} disabled={loading || !repoUrl}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
            </div>

          {result && (
            <div className="mt-4 text-gray-600 border rounded p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
      <GitHubAuth></GitHubAuth>

      <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Jira Integration</h2>
      <ConnectJiraButton />

      <p className="text-gray-600 mt-2">
        Connect your Jira account to track issues and technical debt.
      </p>

      {session.data?.jiraAccessToken && (
        <>
          {jiraProjects && Array.isArray(jiraProjects.values) ? (
            jiraProjects.values.length > 0 ? (
              <JiraProjects values={jiraProjects.values} report={result} />
            ) : (
              <p className="text-gray-600 mt-4">You have no Jira projects available.</p>
            )
          ) : (
            <p className="text-gray-500 mt-4">Loading projects...</p>
          )}
        </>
        )}
    </div>
    </main>
  )
}
