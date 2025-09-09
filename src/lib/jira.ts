import type { JiraAccessibleResource, Projects as JiraProjectsType } from "@/types/jira";
import type { JWT } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function fetchMe(req: NextRequest)  {
  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as JWT | null;
  const jira = token?.jira;

  if (!jira?.accessToken) throw new Error("Jira access token not found");

  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: { Authorization: `Bearer ${jira.accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const err = new Error(`Failed to fetch user info: ${response.statusText}`) as Error & {
      status?: number; jiraError?: unknown;
    };
    err.status = response.status;
    try { err.jiraError = await response.json(); } catch {}
    throw err;
  }

  const resources = (await response.json()) as JiraAccessibleResource[];
  const site = resources.find(
    (r) => r.id && r.url && r.scopes.includes("read:jira-work")
  );

  jira.cloudId = site?.id;

  if (!site) throw new Error("No accessible Jira site found");

  return { id: site.id, name: site.name };
}

export async function fetchProjects(req: NextRequest, cloudId: string): Promise<JiraProjectsType> {
  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as JWT | null;
  const jira = token?.jira;

  if (!jira?.accessToken) throw new Error("Jira access token not found");

  const projectsRes = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
    {
      headers: { Authorization: `Bearer ${jira.accessToken}`, Accept: "application/json" },
      cache: "no-store",
    }
  );

  const projects = (await projectsRes.json()) as JiraProjectsType;
  return projects;
}