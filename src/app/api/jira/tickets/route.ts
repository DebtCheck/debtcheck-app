import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { DeadCode, DeprecatedLibs } from "@/types/report";
import { authOptions } from "@/lib/auth/auth";
import { ensureFreshJiraAccessToken, fetchAccessibleResources } from "@/lib/jira";
import { jsonError, jsonOk } from "@/lib/http/response";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return jsonError("Unauthorized", 401);
  
  const { accessToken } = await ensureFreshJiraAccessToken(userId);

  if (!accessToken) {
    return jsonError("Unauthorized", 401);
  }

  const { projectId, report } = await req.json();

  if (!report) {
    return jsonError("Invalid report", 400);
  }

  if (!projectId) {
    return jsonError("Invalid project ID", 400);
  }

  const user = await fetchAccessibleResources(accessToken);

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

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
    return jsonOk("No issues detected, no Jira tickets created.");
  }
  
  
  for (const action of issueActions) {
    try {
      const requestJira = await fetch(`https://api.atlassian.com/ex/jira/${user.id}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
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
      

      const data = await requestJira.json();
      if (!requestJira.ok) {
        console.error(`Failed to create ticket:`, data);
      } else {
        console.log(`Created ticket: ${data.key}`);
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  }

  return jsonOk("Jira tickets created successfully.");
}