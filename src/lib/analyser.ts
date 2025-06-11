import { RepoFileTree, RepoMetadata, RepoPRs } from "@/types/repo";
import { AnalyzeIssues, AnalyzePrs, AnalyzeStaleness } from "@/types/report";
import { fetchRepoPR } from "./github";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function analyzeFileTree(files: RepoFileTree,)  {
  const session = await getServerSession(authOptions);
  const response = await fetch(`${process.env.RUST_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken && { "Authorization": `Bearer ${session.accessToken}` }),
    },
    body: JSON.stringify(files),
  });

  if (!response.ok) {
    throw new Error(`Error analyzing repo: ${response.statusText}`);
  } 

  return response.json();
}

export async function analyzeMetadata(metadata: RepoMetadata) {
  const updatedAtReport: AnalyzeStaleness =  analyzeStaleness(metadata.updated_at, "updated_at"); 
  const pushedAtReport: AnalyzeStaleness = analyzeStaleness(metadata.pushed_at, "pushed_at");

  const issuesReport: AnalyzeIssues =  analyzeIssues(metadata.open_issues_count, metadata.total_issues_count);

  const prsReport: AnalyzePrs = await analyzePRs(metadata); 

  return {
    updatedAtReport,
    pushedAtReport,
    issuesReport,
    prsReport,
  }
}

function analyzeStaleness(dateStr: string, label: string) {
  const date = new Date(dateStr);
  const currentDate = new Date();
  const timeDiff = (currentDate.getTime() - date.getTime()) / (1000 * 3600 * 24);
  const daysAgo = Math.round(timeDiff);
  const isStale = timeDiff > 90;

  return {
    label,
    stale: isStale,
    daysSinceUpdate: daysAgo,
    message: isStale
      ? `${label} is stale: last activity was ${daysAgo} days ago.`
      : `${label} is fresh: last activity was ${daysAgo} days ago.`,
  }
}

function analyzeIssues(openIssuesCount: number, totalIssuesCount: number) {
  const IssuesRatio = openIssuesCount / totalIssuesCount;
  const isManyIssuesUnresolved = IssuesRatio > 0.5;

  return {
    IssuesRatio,
    isManyIssuesUnresolved,
    message: isManyIssuesUnresolved
      ? `There are many unresolved issues: ${IssuesRatio * 100}% of issues are open.`
      : `The issue resolution rate is good: ${IssuesRatio * 100}% of issues are open.`,
  }
}

async function analyzePRs(metadata: RepoMetadata) {

  const currentDate = new Date();
  
  const allPRs: RepoPRs[] = await fetchRepoPR(metadata.owner, metadata.name);

  const stalePRsCount = allPRs.reduce((count, pr: { created_at: string }) => {
    const created_at = new Date(pr.created_at);
    const ageInDays = Math.round((currentDate.getTime() - created_at.getTime()) / (1000 * 3600 * 24));
    return ageInDays > 30 ? count + 1 : count;
  }, 0);

  return {
    stalePRsCount,
    message: `There ${stalePRsCount > 1 ? 'are' : 'is'} ${stalePRsCount} PRs that are 30 days old or more`
  };
  
}