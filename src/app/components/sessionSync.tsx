"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function SessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    // Store GitHub session in localStorage
    if (session.githubAccessToken) {
      localStorage.setItem("githubAccessToken", session.githubAccessToken);
      localStorage.setItem("githubUser", JSON.stringify(session.githubUser));
    }

    // Store Jira session in localStorage
    if (session.jiraAccessToken) {
      localStorage.setItem("jiraAccessToken", session.jiraAccessToken);
      localStorage.setItem("jiraSite", JSON.stringify(session.jiraSite));
    }
  }, [session]);

  return null;
}