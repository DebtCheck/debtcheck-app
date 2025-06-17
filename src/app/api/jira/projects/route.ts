import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Projects } from "@/types/jira";
import { NextResponse } from "next/server";

export async function fetchMe()  {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new Error("No session found");
  }

  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: {
      "Authorization": `Bearer ${session.jiraAccessToken}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const error = new Error(`Failed to fetch user info: ${response.statusText}`) as Error & { status?: number; jiraError?: unknown };
    error.status = response.status;
    error.jiraError = await response.json();
    throw error;
  }

  const user = await response.json();

  const site = user.find((r: { id: unknown; url: unknown; scopes: string | string[]; }) => r.id && r.url && r.scopes?.includes("read:jira-work"));
  
  return {
    id: site.id,
    name: site.name,
  };
}

export async function Projects(id: string): Promise<Projects> {
  const session = await getServerSession(authOptions);

  if (!session) {
      throw new Error("No session found");
  }
  
  const jiraAccessToken = session.jiraAccessToken;

  const projectsRes = await fetch(
    `https://api.atlassian.com/ex/jira/${id}/rest/api/3/project/search`,
    {
      headers: {
        Authorization: `Bearer ${jiraAccessToken}`,
        Accept: "application/json",
      },
    }
  );

  const projects = await projectsRes.json();

  return projects;
  
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new Error("No session found");
  }

  const user = await fetchMe();

  const projects = await Projects(user.id);

  return NextResponse.json(projects);

}