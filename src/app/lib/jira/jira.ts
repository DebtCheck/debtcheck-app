import type { JiraAccessibleResource, JiraAccount, Projects as JiraProjectsType } from "@/app/types/jira";
import { prisma } from "../prisma";

const JIRA_PROVIDERS = ["atlassian", "jira"] as const;
type JiraProvider = (typeof JIRA_PROVIDERS)[number];

export async function getJiraAccount(userId: string): Promise<JiraAccount | null> {
  return prisma.account.findFirst({
    where: { userId, provider: { in: JIRA_PROVIDERS as unknown as JiraProvider[] } },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });
}

export async function refreshJira(account: JiraAccount): Promise<JiraAccount | null> {
  if (!account.refresh_token) return null;

  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      refresh_token: account.refresh_token,
    }),
  });

  if (!res.ok) return null;

  const d: { access_token: string; refresh_token?: string; expires_in: number } = await res.json();
  const expires_at = Math.floor(Date.now() / 1000) + (d.expires_in ?? 3600) - 60;

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: d.access_token,
      refresh_token: d.refresh_token ?? account.refresh_token,
      expires_at,
    },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  return updated;
}

export async function ensureFreshJiraAccessToken(userId: string): Promise<{
  accessToken: string;
  account: JiraAccount;
}> {
  const acc = await getJiraAccount(userId);
  if (!acc || !acc.access_token) {
    throw new Error("Jira not linked");
  }

  const now = Math.floor(Date.now() / 1000);
  const expired = typeof acc.expires_at === "number" && acc.expires_at > 0 && acc.expires_at <= now;

  if (!expired) {
    return { accessToken: acc.access_token, account: acc };
  }

  const refreshed = await refreshJira(acc);
  if (!refreshed || !refreshed.access_token) {
    throw new Error("Jira refresh failed");
  }

  return { accessToken: refreshed.access_token, account: refreshed };
}

export async function fetchAccessibleResources(accessToken: string)  {

  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
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

  if (!site) throw new Error("No accessible Jira site found");

  return { id: site.id, name: site.name };
}

export async function fetchProjects(cloudId: string, accessToken: string): Promise<JiraProjectsType> {
  const projectsRes = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    }
  );

  const projects = (await projectsRes.json()) as JiraProjectsType;
  return projects;
}