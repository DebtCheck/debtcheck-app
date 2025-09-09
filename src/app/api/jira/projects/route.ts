import type { JiraAccessibleResource } from "@/types/jira";
import type { JWT } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchProjects } from "@/lib/jira";


export async function GET(req: NextRequest) {
  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as JWT | null;
  const jira = token?.jira;

  if (!jira?.accessToken) return NextResponse.json({ error: "Not linked with Jira" }, { status: 401 });
  if (jira.error)        return NextResponse.json({ error: "Re-auth Jira" }, { status: 401 });

  // Fallback: fetch cloudId if missing
  let cloudId = jira.cloudId;
  if (!cloudId) {
    const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${jira.accessToken}` },
    });
    const resources = (await res.json()) as JiraAccessibleResource[];
    const site = resources.find(
      (r) => r.id && r.url && r.scopes.includes("read:jira-work")
    );
    if (!site) {
      return NextResponse.json({ error: "No Jira site found" }, { status: 400 });
    }
    cloudId = site.id;
  }

  const projects = await fetchProjects(req, cloudId);
  return NextResponse.json(projects);
}