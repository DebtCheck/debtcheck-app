import { analyzeFileTree, analyzeMetadata } from "@/app/lib/analyser";
import { authOptions } from "@/app/lib/auth/auth";
import {
  ensureFreshGithubAccessToken,
  fetchRepoFileTree,
  fetchRepoMetadata,
  filterFiles,
} from "@/app/lib/github/github";
import { jsonError, toErrorResponse } from "@/app/lib/http/response";
import { ParsedGitHubUrl, RepoFileTree, RepoMetadata } from "@/app/types/repo";
import { Report } from "@/app/types/report";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GitHubApiError = Error & {
  status?: number;
  githubError?: { message?: string };
};

export async function POST(req: NextRequest) {
  const { repoUrl, demo } = await req.json();

  if (!repoUrl) {
    return jsonError("Missing repo URL", 400);
  }

  const parsedUrl = parseGitHubUrl(repoUrl);

  if (!parsedUrl) {
    return jsonError("Invalid GitHub URL", 400);
  }

  const { owner: repoOwner, repo: repoName } = parsedUrl;

  if (!repoOwner) {
    return jsonError("Invalid GitHub URL. Expected https://github.com/<owner>/<repo>", 400);
  }

  const isDemo = Boolean(demo);
  let accessToken = ""; // empty by default for demo

  if (!isDemo) {
    // only require session/token when NOT demo
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return jsonError("Unauthorized", 401);

    try {
      ({ accessToken } = await ensureFreshGithubAccessToken(userId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "GitHub not linked";
      return jsonError(msg, 401);
    }
  }

  try {
    const repoMetadataRaw = await fetchRepoMetadata(repoOwner, repoName, accessToken);

    const metadata: RepoMetadata = {
      owner: repoMetadataRaw.owner.login,
      name: repoMetadataRaw.name,
      description: repoMetadataRaw.description,
      created_at: repoMetadataRaw.created_at,
      updated_at: repoMetadataRaw.updated_at,
      pushed_at: repoMetadataRaw.pushed_at,
      size: repoMetadataRaw.size,
      stargazers_count: repoMetadataRaw.stargazers_count,
      forks_count: repoMetadataRaw.forks_count,
      watchers_count: repoMetadataRaw.watchers_count,
      open_issues_count: repoMetadataRaw.open_issues_count,
      total_issues_count: repoMetadataRaw.total_issues_count,
      subscribers_count: repoMetadataRaw.subscribers_count,
      pulls_url: repoMetadataRaw.pulls_url,
      default_branch: repoMetadataRaw.default_branch,
      trees_url: repoMetadataRaw.trees_url,
    };

    const rawTree = await fetchRepoFileTree(metadata.trees_url, accessToken);
    const filteredTree = await filterFiles(rawTree);
    const filteredFiles: RepoFileTree = { tree: filteredTree };

    const [metaReport, rustAnalysisReportRaw] = await Promise.all([
      analyzeMetadata(req, metadata, accessToken),
      analyzeFileTree(filteredFiles, accessToken, isDemo, { owner: repoOwner, name: repoName }),
    ]);
    const rustAnalysisReport = rustAnalysisReportRaw as import("@/app/types/report").RustAnalysisReport;

    const report: Report = {
      updatedAtReport: metaReport.updatedAtReport,
      pushedAtReport: metaReport.pushedAtReport,
      issuesReport: metaReport.issuesReport,
      prsReport: metaReport.prsReport,
      rustAnalysisReport,
    };

    return NextResponse.json({ ok: true, data: report }, { status: 200 });
  } catch (err: unknown) {
    if (isGitHubApiError(err)) {
      // If it tries to access a repo from an organization that didn't allow the API
      const githubMessage = err.githubError?.message;
      let type: "GITHUB_ERROR" | "OAUTH_APP_BLOCKED" | "SSO_NOT_AUTHORIZED" = "GITHUB_ERROR";
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
        { error: githubMessage ?? "GitHub API error", details: { type, docsUrl, status: err.status ?? 403 } },
        { status: err.status ?? 403 },
      );
    }

    if (isGhRateLimited(err)) {
    const secs = retryAfterSecondsFromHeaders(err.headers);
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "GitHub rate limited (unauthenticated).",
          hint: "Sign in with GitHub for a higher quota or retry later.",
          meta: { retry_after_secs: secs },
        },
      },
      { status: 429, headers: { "Retry-After": String(secs) } }
    );
  }

    return toErrorResponse(err);
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

function isGitHubApiError(err: unknown): err is GitHubApiError {
  return (
    err instanceof Error &&
    "githubError" in err &&
    typeof (err as { githubError?: unknown }).githubError === "object"
  );
}

function isGhRateLimited(err: unknown): err is { isGithubRateLimited: true; headers: Headers } {
  return Boolean(err && typeof err === "object" && (err as { isGithubRateLimited?: unknown }).isGithubRateLimited && (err as { headers?: Headers }).headers);
}


function retryAfterSecondsFromHeaders(h: Headers): number {
  // 1) Prefer Retry-After if present
  const ra = h.get("Retry-After");
  if (ra) {
    const n = Number(ra);
    if (Number.isFinite(n)) return Math.max(0, Math.ceil(n)); // delta-seconds
    const d = Date.parse(ra); // HTTP-date
    if (!Number.isNaN(d)) return Math.max(0, Math.ceil((d - Date.now()) / 1000));
  }

  // 2) Fallback to X-RateLimit-Reset (UNIX seconds)
  const reset = h.get("X-RateLimit-Reset");
  if (reset) {
    const until = parseInt(reset, 10);
    if (Number.isFinite(until)) {
      const secs = until - Math.floor(Date.now() / 1000);
      return Math.max(0, Math.ceil(secs));
    }
  }

  // 3) Sensible default
  return 60;
}