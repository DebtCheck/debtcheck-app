import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { DeadCode, DeprecatedLibs } from "@/types/report";
import { fetchMe } from "../projects/route";
import { getToken, JWT } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.providers?.jira) {
    return NextResponse.json({ error: "Unauthorized: Missing Jira access token." }, { status: 401 });
  }

  const { projectId, report } = await req.json();
  
  const user = await fetchMe(req);

  const issueActions = [
    report?.updatedAtReport?.stale && {
      label: "Repo is stale",
      summary: "Repository appears stale",
      description: report.updatedAtReport.message,
    },
    report?.issuesReport?.isManyIssuesUnresolved && {
      label: "Unresolved issues",
      summary: "Too many unresolved issues",
      description: report.issuesReport.message,
    },
    report?.prsReport?.stalePRsCount > 0 && {
      label: "Stale PRs",
      summary: "Stale pull requests detected",
      description: report.prsReport.message,
    },
    report?.fileTreeReport?.dead_code?.length > 0 && {
      label: "Dead Code",
      summary: "Dead code found in repo",
      description: report.fileTreeReport.dead_code
        .map((item: DeadCode) => `• ${item.kind} "${item.name}" in ${item.file}:${item.line}`)
        .join("\n"),
    },
    report?.fileTreeReport?.deprecated_libs?.some(
      (lib: DeprecatedLibs) =>
        lib.deprecated || lib.status === "error" || lib.status === "warning"
    ) && {
      label: "Deprecated Libraries",
      summary: "Deprecated or unstable libraries in use",
      description: report.fileTreeReport.deprecated_libs
        .filter(
          (lib: DeprecatedLibs) =>
            lib.deprecated || lib.status === "error" || lib.status === "warning"
        )
        .map((lib: DeprecatedLibs) => `• ${lib.name}: ${lib.current} → ${lib.latest} [${lib.status}]`)
        .join("\n"),
    }
  ].filter(Boolean);
  
  if (!issueActions.length) {
    console.log("✅ Aucun problème détecté, aucun ticket Jira à créer.");
    return NextResponse.json({ message: "No issues detected" });
  }
  
  
  for (const action of issueActions) {
    try {
      const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as JWT | null;
      const jira = token?.jira;

      if (!jira?.accessToken) throw new Error("Jira access token not found");
      
      const res = await fetch(`https://api.atlassian.com/ex/jira/${user.id}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jira.accessToken}`
        },
        body: JSON.stringify({
          fields: {
          project: { id: projectId },
          summary: action.summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: action.description,
                  },
                ],
              },
            ],
          },
          issuetype: { name: "Task" },
        },
        }),
      });
      

      const data = await res.json();
      if (!res.ok) {
        console.error(`Failed to create ticket:`, data);
      } else {
        console.log(`Created ticket: ${data.key}`);
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  }

  return NextResponse.json({message: "created ticket"});
}