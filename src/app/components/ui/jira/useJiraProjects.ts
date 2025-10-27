"use client";

import { useCallback, useState } from "react";
import { Projects } from "@/app/types/jira";

type ProjectsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; data: Projects }
  | { kind: "error"; message: string };

export function useJiraProjects() {
  const [state, setState] = useState<ProjectsState>({ kind: "idle" });

  const fetchProjects = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/jira/projects", { method: "GET", cache: "no-store" });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message = typeof (data as { error?: string })?.error === "string"
          ? (data as { error: string }).error
          : "Failed to fetch Jira projects";
        setState({ kind: "error", message });
        return;
      }
      
      setState({ kind: "loaded", data: data as Projects });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setState({ kind: "error", message });
    }
  }, []);

  return { state, fetchProjects };
}
