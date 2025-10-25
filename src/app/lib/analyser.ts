import { RepoFileTree, RepoMetadata, RepoPRs } from "@/app/types/repo";
import {
  AnalyzeIssues,
  AnalyzePrs,
  AnalyzeStaleness,
  IssuesAnalysis,
} from "@/app/types/report";
import { fetchRepoPR } from "./github/github";
import { NextRequest } from "next/server";
import { fetchJsonOrThrow } from "./http/rust-error";

export async function analyzeFileTree(
  files: RepoFileTree,
  accessToken: string,
  demo: boolean,
  repo: { owner: string; name: string }
) {
  const url = `${process.env.RUST_URL}/analyze`;
  console.log(accessToken);
  
  const toBlobUrl = (sha: string) =>
    `https://api.github.com/repos/${repo.owner}/${repo.name}/git/blobs/${sha}`;
  const tree_files = files.tree.map(f => ({
    path: f.path,
    url: toBlobUrl(f.sha),
  }));
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(accessToken
      ? { "X-Github-Access-Token": accessToken } // server-side only
      : {}),
  };


  return fetchJsonOrThrow<unknown>(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      tree_files,
      demo: !accessToken || demo, 
    }),
  });
}

export async function analyzeMetadata(
  req: NextRequest,
  metadata: RepoMetadata,
  accessToken: string
) {
  const updatedAtReport: AnalyzeStaleness = analyzeStaleness(
    metadata.updated_at,
    "updated_at"
  );
  const pushedAtReport: AnalyzeStaleness = analyzeStaleness(
    metadata.pushed_at,
    "pushed_at"
  );

  const issuesReport: AnalyzeIssues = analyzeIssues(
    metadata.open_issues_count,
    metadata.total_issues_count
  );

  const prsReport: AnalyzePrs = await analyzePRs(req, metadata, accessToken);

  return {
    updatedAtReport,
    pushedAtReport,
    issuesReport,
    prsReport,
  };
}

function analyzeStaleness(dateStr: string, label: string) {
  const date = new Date(dateStr);
  const currentDate = new Date();
  const timeDiff =
    (currentDate.getTime() - date.getTime()) / (1000 * 3600 * 24);
  const daysAgo = Math.floor(timeDiff);
  const isStale = timeDiff > 90;

  return {
    label,
    stale: isStale,
    daysSinceUpdate: daysAgo,
    message: isStale
      ? `${label} is stale: last activity was ${daysAgo} days ago.`
      : `${label} is fresh: last activity was ${daysAgo} ${
          daysAgo === 1 ? "day" : "days"
        } ago.`,
  };
}

export function analyzeIssues(
  openIssuesCount: number,
  totalIssuesCount: number
): IssuesAnalysis {
  const total = Math.max(0, totalIssuesCount | 0);
  let open = Math.max(0, openIssuesCount | 0);
  if (total > 0) open = Math.min(open, total);

  const issuesRatio = total === 0 ? 0 : open / total;
  const isManyIssuesUnresolved = issuesRatio > 0.5;

  const toPercent = (x: number) =>
    `${Math.round(Math.max(0, Math.min(100, x * 100)) * 10) / 10}%`;

  let message: string;
  if (total === 0) {
    message = "No issues to analyze.";
  } else if (isManyIssuesUnresolved) {
    message = `Many unresolved issues: ${toPercent(
      issuesRatio
    )} of issues are open.`;
  } else {
    message = `Good resolution rate: ${toPercent(
      issuesRatio
    )} of issues are open.`;
  }

  return { issuesRatio, isManyIssuesUnresolved, message };
}

async function analyzePRs(
  req: NextRequest,
  metadata: RepoMetadata,
  accessToken: string
) {
  const currentDate = new Date();

  const allPRs: RepoPRs[] = await fetchRepoPR(
    metadata.owner,
    metadata.name,
    accessToken
  );

  const stalePRsCount = allPRs.reduce((count, pr: { created_at: string }) => {
    const created_at = new Date(pr.created_at);
    const ageInDays = Math.round(
      (currentDate.getTime() - created_at.getTime()) / (1000 * 3600 * 24)
    );
    return ageInDays > 30 ? count + 1 : count;
  }, 0);

  return {
    stalePRsCount,
    message: `There ${
      stalePRsCount > 1 ? "are" : "is"
    } ${stalePRsCount} PRs that are 30 days old or more`,
  };
}
