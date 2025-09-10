import { analyzeFileTree, analyzeMetadata } from "@/lib/analyser";
import { authOptions } from "@/lib/auth/auth";
import { ensureFreshGithubAccessToken, fetchRepoFileTree, fetchRepoMetadata, filterFiles } from "@/lib/github";
import { ParsedGitHubUrl, RepoFileTree, RepoMetadata } from "@/types/repo";
import { Report } from "@/types/report";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { repoUrl } = await req.json()

  if (!repoUrl) {
    return new Response("Missing repo URL", { status: 400 });
  }

  const parsedUrl = parseGitHubUrl(repoUrl);
  const repoOwner = parsedUrl?.owner;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let accessToken: string;
  try {
    ({ accessToken } = await ensureFreshGithubAccessToken(userId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GitHub not linked";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    const res = await fetchRepoMetadata(req, repoUrl, accessToken	);
    
    const metadata: RepoMetadata = {
      owner: res.owner.login,
      name: res.name,
      description: res.description,
      created_at: res.created_at,
      updated_at: res.updated_at,
      pushed_at: res.pushed_at,
      size: res.size,
      stargazers_count: res.stargazers_count,
      forks_count: res.forks_count,
      watchers_count: res.watchers_count,
      open_issues_count: res.open_issues_count,
      total_issues_count: res.total_issues_count,
      subscribers_count: res.subscribers_count,
      pulls_url: res.pulls_url,
      default_branch: res.default_branch,
      trees_url: res.trees_url,
    }

    const fileTree = await fetchRepoFileTree(req, metadata.trees_url, accessToken);
    
    const resFiltered = await filterFiles(fileTree);
    const filteredFiles: RepoFileTree = {
      tree: resFiltered,
    }
    

    const resReport = await analyzeMetadata(req, metadata, accessToken);

    const analysis = await analyzeFileTree(req, filteredFiles, accessToken);

    const report: Report = {
      updatedAtReport: resReport.updatedAtReport,
      pushedAtReport: resReport.pushedAtReport,
      issuesReport: resReport.issuesReport,
      prsReport: resReport.prsReport,
      fileTreeReport: analysis,
    }
    

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    if (isGitHubApiError(err)) {
      // If it tries to access a repo from an organization that didn't allow the API
      const githubMessage = err.githubError?.message;
      let type = "GITHUB_ERROR";
      let docsUrl: string | undefined;

      if (githubMessage?.includes("OAuth App access restrictions")) {
        type = "OAUTH_APP_BLOCKED";
        docsUrl =
          "https://docs.github.com/articles/restricting-access-to-your-organization-s-data/";
      } else if (githubMessage?.includes("SAML enforcement")) {
        type = "SSO_NOT_AUTHORIZED";
        docsUrl = `https://github.com/orgs/${repoOwner}/sso`;
      }

      return NextResponse.json(
        {
          error: githubMessage,
          details: {
            type,
            docsUrl,
            status: err.status ?? 403,
          },
        },
        { status: err.status ?? 403 }
      );
    }

    // fallback error
    return NextResponse.json(
      { error: "Unexpected error processing repo" },
      { status: 500 }
    );
  }
}
function parseGitHubUrl(repoUrl: string): ParsedGitHubUrl | null {
  try {
    const parsed = new URL(repoUrl);
    if (
      parsed.hostname !== "github.com" &&
      parsed.hostname !== "www.github.com"
    ) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean); // removes empty segments

    if (parts.length < 2) {
      return null;
    }

    const [owner, repo] = parts;

    // Remove ".git" if user pasted clone URL
    const cleanedRepo = repo.endsWith(".git") ? repo.slice(0, -4) : repo;

    return { owner, repo: cleanedRepo };
  } catch {
    return null;
  }
}

type GitHubApiError = Error & {
  status?: number;
  githubError?: { message?: string };
};

function isGitHubApiError(err: unknown): err is GitHubApiError {
  return (
    err instanceof Error &&
    "githubError" in err &&
    typeof (err as { githubError?: unknown }).githubError === "object"
  );
}