import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import {
  asDepStatus,
  DeadCodeItem,
  DeprecatedLibs,
  DepStatus,
} from "@/app/types/report";
import { authOptions } from "@/app/lib/auth/auth";
import {
  ensureFreshJiraAccessToken,
  fetchAccessibleResources,
} from "@/app/lib/jira/jira";
import { jsonError, jsonOk } from "@/app/lib/http/response";
import { CreateIssueResult, PlannedIssue } from "@/app/types/jira";
import {
  baseLabels,
  createJiraIssue,
  describeDeadCode,
  describeDeps,
  describeIssues,
  describePRs,
  describeSecrets,
  describeStaleness,
  fetchCreateMeta,
  priorityFromDepStatus,
} from "@/app/lib/jira/tickets";

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

  const site = await fetchAccessibleResources(accessToken);

  if (!site) {
    return jsonError("Unauthorized", 401);
  }

  const planned: PlannedIssue[] = [];

  // 1) Staleness (updatedAt/pushedAt)
  if (report.updatedAtReport?.stale || report.pushedAtReport?.stale) {
    planned.push({
      summary: "Repository staleness",
      description: describeStaleness(report),
      labels: baseLabels("staleness"),
      priority: "Medium",
    });
  }

  // 2) Issues
  if (report.issuesReport?.isManyIssuesUnresolved) {
    planned.push({
      summary: "High ratio of unresolved issues",
      description: describeIssues(report),
      labels: baseLabels("issues"),
      priority: "Medium",
    });
  }

  // 3) PRs
  if (report.prsReport?.stalePRsCount > 0) {
    planned.push({
      summary: `Stale PRs detected (${report.prsReport.stalePRsCount})`,
      description: describePRs(report),
      labels: baseLabels("pull-requests"),
      priority: "Medium",
    });
  }

  // 4) Dead code (top N)
  const dead = report.rustAnalysisReport?.report_parse?.dead_code ?? [];
  if (dead.length > 0) {
    planned.push({
      summary: `Dead code to remove (${dead.length} items)`,
      description: describeDeadCode(dead),
      labels: baseLabels("dead-code"),
      priority: "Low",
    });
  }

  // 5) Dependencies (non-ok)
  const libs = report.rustAnalysisReport?.deprecated_libs ?? [];
  const problematic = libs.filter(
    (l: { deprecated: any; status: string }) =>
      l.deprecated || asDepStatus(l.status) !== "ok"
  );
  if (problematic.length > 0) {
    // choose priority from worst status present
    const worst: DepStatus = problematic.some(
      (l: { status: string }) => asDepStatus(l.status) === "error"
    )
      ? "error"
      : problematic.some(
          (l: { status: string }) => asDepStatus(l.status) === "warning"
        )
      ? "warning"
      : "ok";
    planned.push({
      summary: `Update dependencies (${problematic.length} to address)`,
      description: describeDeps(libs),
      labels: baseLabels("dependencies"),
      priority: priorityFromDepStatus(worst),
    });
  }

  // 6) Secrets / .env presence
  const secrets = report.rustAnalysisReport?.report_parse?.env_vars ?? [];
  if (report.rustAnalysisReport?.is_env_present || secrets.length > 0) {
    const preview = secrets[0]?.value_preview ?? "";
    planned.push({
      summary: "Potential secrets in repository",
      description: describeSecrets(
        preview,
        secrets.length,
        Boolean(report.rustAnalysisReport?.is_env_present)
      ),
      labels: baseLabels("secrets"),
      priority: "High",
    });
  }

  if (planned.length === 0) {
    return jsonOk({
      created: 0,
      issues: [],
      message: "No problems detected, nothing to create.",
    });
  }

  const meta = await fetchCreateMeta(
    site.id,
    accessToken,
    projectId,
    "Task"
  ).catch(() => null);
  const results: CreateIssueResult[] = [];
  for (const pi of planned) {
    const result = await createJiraIssue(
      site.id,
      accessToken,
      projectId,
      meta?.issueTypeId ?? "10001",
      pi.summary,
      pi.description,
      pi.labels,
      pi.priority,
      meta?.fields
    );
    results.push(result);
  }

  const created = results.filter((r) => r.ok) as Extract<
    CreateIssueResult,
    { ok: true }
  >[];
  const failed = results.filter((r) => !r.ok) as Extract<
    CreateIssueResult,
    { ok: false }
  >[];

  return jsonOk({
    created: created.length,
    issues: created.map((c) => ({ id: c.id, key: c.key, summary: c.summary })),
    failures: failed.map((f) => ({
      summary: f.summary,
      error: f.error,
      status: f.status,
    })),
  });
}
