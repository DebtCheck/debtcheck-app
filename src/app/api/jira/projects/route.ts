import type { JiraAccessibleResource } from "@/types/jira";
import { NextRequest, NextResponse } from "next/server";
import { ensureFreshJiraAccessToken, fetchProjects } from "@/lib/jira";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { jsonError, jsonOk } from "@/lib/http/response";


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return jsonError("Unauthorized", 401);

  const { accessToken } = await ensureFreshJiraAccessToken(userId);

  const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return jsonError(j?.error ?? `Jira resources error ${res.status}`, res.status)
  }
  const resources = (await res.json()) as JiraAccessibleResource[];
  const site = resources.find((r) => r.id && r.url && r.scopes.includes("read:jira-work"));
  if (!site) return NextResponse.json({ error: "No Jira site found" }, { status: 400 });

  const projects = await fetchProjects(req, site.id, accessToken);
  return jsonOk(projects)
}