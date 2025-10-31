export type HistoryIssue = {
  id: string;
  key: string;
  summary: string;
  created: string; // ISO
  url?: string;
};

export type HistoryResponse =
  | { total: number; issues: HistoryIssue[] }
  | { error: string };

// —— Jira helpers (strict)
export async function getProjectKey(
  cloudId: string,
  accessToken: string,
  projectId: string
): Promise<string> {
  const res = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${encodeURIComponent(
      projectId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`project ${res.status}`);
  const data = (await res.json()) as { key: string };
  return data.key;
}

export function buildJql(opts: {
  projectKey: string;
  repo?: string;
  category?: string;
}): { primary: string; fallback: string } {

  // Base filter: our labels always include "debtcheck"
  const base = [`project = ${opts.projectKey}`, `labels in (debtcheck)`];

  if (opts.category) base.push(`labels in ("category:${opts.category}")`);
  if (opts.repo) base.push(`text ~ "${opts.repo}"`);

  return {
    primary: `${base.join(" AND ")} ORDER BY created DESC`,
    fallback: `${base.join(" AND ")} ORDER BY created DESC`, // identical now for simplicity
  };
}

export async function searchIssues(
  cloudId: string,
  accessToken: string,
  jql: string,
  maxResults: number,
  siteUrl?: string
): Promise<HistoryIssue[]> {
  const body = JSON.stringify({
    jql,
    maxResults: Math.min(Math.max(maxResults, 1), 50),
    fields: ["summary", "created"],
  });

  const common = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store" as const,
    body,
  };

  // 1) Try the new endpoint
  const urlNew = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`;
  let r = await fetch(urlNew, common);
  let text = await r.text();

  // 2) Fallback for older tenants (or if new endpoint is not enabled)
  if (!r.ok && (r.status === 404 || r.status === 410)) {
    const urlOld = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`;
    r = await fetch(urlOld, common);
    text = await r.text();
  }

  if (!r.ok) {
    let msg = `search ${r.status}`;
    try {
      const j = JSON.parse(text) as {
        errorMessages?: string[];
        errors?: Record<string, string>;
      };
      if (j.errorMessages?.length) msg += `: ${j.errorMessages.join("; ")}`;
      else if (j.errors) msg += `: ${Object.values(j.errors).join("; ")}`;
    } catch {
      if (text) msg += `: ${text.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = JSON.parse(text) as {
    issues: Array<{
      id: string;
      key: string;
      fields: { summary: string; created: string };
    }>;
  };

  const base = siteUrl ? siteUrl.replace(/\/+$/, "") : undefined;

  return data.issues.map((i) => ({
    id: i.id,
    key: i.key,
    summary: i.fields.summary,
    created: i.fields.created,
    url: base ? `${base}/browse/${i.key}` : undefined,
  }));
}
