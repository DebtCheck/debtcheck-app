"use client";

import { Projects } from "@/types/jira";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import JiraProjects from "./jiraProjects";
import { Report } from "@/types/report";

type Props = {
  report: Report | null;
}

export default function JiraAuth({ report }: Props) {
  const { data: session, status } = useSession();

  const [jiraProjects, setJiraProjects] = useState<Projects | null>(null);
    const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [, setError] = useState<string | null>(null);
  
    const jiraLinked = !!session?.providers?.jira;

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
      <>
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
                <JiraProjects values={jiraProjects.values} report={report} />
              ) : (
                <p className="text-gray-600 mt-4">You have no Jira projects available.</p>
              )
            ) : null}
              <DisconnectJiraButton />
          </>
        )}
      </>
    )
}

export function ConnectJiraButton() {

  const handleConnect = () => {
    signIn("jira", { callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
    >
      Connect to Jira
    </button>
  );
}


export function DisconnectJiraButton() {
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/jira", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to disconnect Jira:", data ?? res.statusText);
      }
      await update();       // <— refresh next-auth session
      router.refresh();  
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={disconnect}>{busy ? "Disconnecting…" : "Disconnect Jira"}</button>
  );
}