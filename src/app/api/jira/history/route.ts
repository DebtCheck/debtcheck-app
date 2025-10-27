import { authOptions } from "@/app/lib/auth/auth";
import {
  buildJql,
  getProjectKey,
  HistoryIssue,
  HistoryResponse,
  searchIssues,
} from "@/app/lib/jira/history";
import {
  ensureFreshJiraAccessToken,
  fetchAccessibleResources,
} from "@/app/lib/jira/jira";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return Response.json({ error: "Missing projectId" }, { status: 400 });
  }
  const repo = searchParams.get("repo") || undefined; // optional: "owner/name"
  const category = searchParams.get("category") || undefined; // optional
  const max = Number(searchParams.get("max") ?? "20");

  try {
    const { accessToken } = await ensureFreshJiraAccessToken(session.user.id);
    const site = await fetchAccessibleResources(accessToken); // has .id (cloudId)
    const projectKey = await getProjectKey(site.id, accessToken, projectId);

    const { primary, fallback } = buildJql({ projectKey, repo, category });

    // Try property-first
    let issues: HistoryIssue[] = [];
    try {
      issues = await searchIssues(site.id, accessToken, primary, max, site.url);
    } catch {
      try {
        issues = await searchIssues(site.id, accessToken, fallback, max, site.url);
      } catch {
        // ultra-simple fallback (some tenants can be picky with label filters)
        const simple = `project = ${projectKey} AND labels = debtcheck ORDER BY created DESC`;
        issues = await searchIssues(site.id, accessToken, simple, max, site.url);
      }
    }

    return Response.json({ total: issues.length, issues });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
