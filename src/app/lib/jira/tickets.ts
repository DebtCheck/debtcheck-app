import {
  AdfBulletList,
  AdfCodeBlock,
  AdfDoc,
  AdfHeading,
  AdfParagraph,
  CreateIssueResult,
  CreateMeta,
  CreateMetaField,
} from "@/app/types/jira";
import {
  asDepStatus,
  DeadCodeItem,
  DeprecatedLibs,
  DepStatus,
} from "@/app/types/report";
import { Report } from "@/app/types/report";

function p(text: string): AdfParagraph {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function h(text: string, level: 1 | 2 | 3 | 4 | 5 | 6): AdfHeading {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}
function bullets(lines: string[]): AdfBulletList {
  return {
    type: "bulletList",
    content: lines.map((t) => ({ type: "listItem", content: [p(t)] })),
  };
}
function codeBlock(text: string, language?: string): AdfCodeBlock {
  return {
    type: "codeBlock",
    attrs: language ? { language } : undefined,
    content: [{ type: "text", text }],
  };
}

export function priorityFromDepStatus(
  s: DepStatus
): "Highest" | "High" | "Medium" | "Low" {
  if (s === "error") return "High";
  if (s === "warning") return "Medium";
  return "Low";
}

export function baseLabels(category: string): string[] {
  return ["debtcheck", "technical-debt", `category:${category}`];
}

export function describeStaleness(report: Report): AdfDoc {
  const items: string[] = [];
  if (report.updatedAtReport?.stale) items.push(report.updatedAtReport.message);
  if (report.pushedAtReport?.stale) items.push(report.pushedAtReport.message);
  return {
    version: 1,
    type: "doc",
    content: [
      h("Repository staleness", 2),
      bullets(items.length ? items : ["Marked stale by DebtCheck."]),
      p("Source: DebtCheck automated analysis."),
    ],
  };
}

export function describeIssues(report: Report): AdfDoc {
  const ratioPct = Math.round((report.issuesReport.issuesRatio ?? 0) * 100);
  return {
    version: 1,
    type: "doc",
    content: [
      h("Unresolved issues", 2),
      bullets([
        `Unresolved issues ratio: ${ratioPct}%`,
        report.issuesReport.message,
      ]),
      p("Source: GitHub issues snapshot at analysis time."),
    ],
  };
}

export function describePRs(report: Report): AdfDoc {
  return {
    version: 1,
    type: "doc",
    content: [
      h("Stale pull requests", 2),
      bullets([
        `Stale PRs (>30d): ${report.prsReport.stalePRsCount}`,
        report.prsReport.message,
      ]),
      p("Source: GitHub PRs snapshot at analysis time."),
    ],
  };
}

export function describeDeadCode(items: DeadCodeItem[]): AdfDoc {
  const MAX = 30;
  const lines = items
    .slice(0, MAX)
    .map((i) => `• ${i.kind} "${i.name}" — ${i.file}:${i.line}`);
  const extra = items.length > MAX ? [`(+${items.length - MAX} more…)`] : [];
  return {
    version: 1,
    type: "doc",
    content: [
      h("Dead code findings", 2),
      bullets([...lines, ...extra]),
      p("Remove unused code to reduce maintenance cost and confusion."),
    ],
  };
}

export function describeDeps(libs: DeprecatedLibs[]): AdfDoc {
  const bad = libs.filter(
    (l) => l.deprecated || asDepStatus(l.status) !== "ok"
  );
  const MAX = 40;
  const lines = bad
    .slice(0, MAX)
    .map(
      (l) =>
        `${l.name}: ${l.current} → ${l.latest} [${l.status}${
          l.deprecated ? ", deprecated" : ""
        }]`
    );
  const extra = bad.length > MAX ? [`(+${bad.length - MAX} more…)`] : [];
  const json = JSON.stringify(bad, null, 2);
  return {
    version: 1,
    type: "doc",
    content: [
      h("Outdated / deprecated dependencies", 2),
      bullets(lines.length ? lines : ["No problematic dependencies in scope."]),
      h("Details (JSON)", 3),
      codeBlock(json, "json"),
    ],
  };
}

export function describeSecrets(
  examplePreview: string,
  count: number,
  envPresent: boolean
): AdfDoc {
  const lines = [
    envPresent
      ? ".env-like file(s) present in repository."
      : "No .env files detected.",
    `${count} secret-like value(s) detected.`,
  ];
  return {
    version: 1,
    type: "doc",
    content: [
      h("Potential secrets / sensitive config", 2),
      bullets(lines),
      h("Example", 3),
      codeBlock(examplePreview || "n/a"),
      p(
        "Review and rotate any exposed credentials, and ensure .env files are excluded from VCS."
      ),
    ],
  };
}

export async function fetchCreateMeta(
  cloudId: string,
  accessToken: string,
  projectId: string,
  issueTypeName = "Task"
): Promise<CreateMeta> {
  const url =
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/createmeta` +
    `?projectIds=${encodeURIComponent(projectId)}` +
    `&issuetypeNames=${encodeURIComponent(issueTypeName)}` +
    `&expand=projects.issuetypes.fields`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`createmeta ${res.status}`);
  }
  const json = (await res.json()) as {
    projects: Array<{
      issuetypes: Array<{
        id: string;
        name: string;
        fields: Record<string, CreateMetaField>;
      }>;
    }>;
  };
  const it = json.projects?.[0]?.issuetypes?.[0];
  if (!it) throw new Error("No issue type meta");

  return { issueTypeId: it.id, fields: it.fields };
}

export function pickPriorityValue(
  fields: Record<string, CreateMetaField>,
  desiredName: "Highest" | "High" | "Medium" | "Low" | undefined
): { id?: string; name?: string } | null {
  const f = fields["priority"];
  if (!f) return null;

  const opts = f.allowedValues ?? [];
  if (opts.length === 0) return null;

  if (desiredName) {
    const byName = opts.find((o) => o.name === desiredName);
    if (byName) return { id: byName.id, name: byName.name };
  }
  // fallback to first allowed
  const first = opts[0];
  return { id: first.id, name: first.name };
}

export async function createJiraIssue(
  cloudId: string,
  accessToken: string,
  projectId: string,
  issueTypeId: string,
  summary: string,
  description: AdfDoc,
  labels: string[],
  priorityName?: "Highest" | "High" | "Medium" | "Low",
  fieldsMeta?: Record<string, CreateMetaField>
) {
  const fields: Record<string, unknown> = {
    project: { id: projectId },
    issuetype: { id: issueTypeId }, // safer than name
    summary,
    description,
    labels,
  };

  // only include priority if screen supports it
  if (fieldsMeta) {
    const val = pickPriorityValue(fieldsMeta, priorityName);
    if (val) fields.priority = val;
  }

  const res = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Jira creation failed", JSON.stringify(body, null, 2));
    
    const msg =
      (body?.errorMessages && body.errorMessages.join("; ")) ||
      (body?.errors && Object.values(body.errors).join("; ")) ||
      "Failed to create issue";
    return { ok: false as const, summary, error: msg, status: res.status };
  }
  return {
    ok: true as const,
    id: body.id as string,
    key: body.key as string,
    summary,
  };
}
