import { RepoFileTree, RepoPRs } from "@/app/types/repo";
import { prisma } from "@/app/lib/prisma";
import { GithubAccount } from "@/app/types/github";
import { githubFetch } from "@/app/lib/github/http";
import { shouldIgnore } from "./files-to-ignore";

const GITHUB_PROVIDER = "github";

export async function getGithubAccount(userId: string): Promise<GithubAccount | null> {
  return prisma.account.findFirst({
    where: { userId, provider: GITHUB_PROVIDER },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
      token_type: true,
    },
  });
}

export async function refreshGithub(account: GithubAccount): Promise<GithubAccount | null> {
  if (!account.refresh_token) return null;

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
      client_id: process.env.GITHUB_ID,
      client_secret: process.env.GITHUB_SECRET,
    }),
  });

  if (!res.ok) return null;

  const d: {
    access_token?: string;
    token_type?: string;
    scope?: string;
    refresh_token?: string;
    expires_in?: number;               // seconds
    refresh_token_expires_in?: number; // seconds
    error?: string;
    error_description?: string;
  } = await res.json();

  if (!d.access_token || d.error) return null;

  const expires_at =
    typeof d.expires_in === "number"
      ? Math.floor(Date.now() / 1000) + d.expires_in - 60
      : account.expires_at ?? null;

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: d.access_token,
      refresh_token: d.refresh_token ?? account.refresh_token,
      token_type: d.token_type ?? account.token_type,
      scope: d.scope ?? account.scope,
      expires_at: expires_at ?? account.expires_at ?? null,
    },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
      token_type: true,
    },
  });

  return updated;
}

export async function ensureFreshGithubAccessToken(userId: string): Promise<{
  accessToken: string;
  account: GithubAccount;
}> {
  const acc = await getGithubAccount(userId);
  if (!acc || !acc.access_token) {
    throw new Error("GitHub not linked");
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired =
    typeof acc.expires_at === "number" && acc.expires_at > 0 && acc.expires_at <= now;

  if (!isExpired) {
    return { accessToken: acc.access_token, account: acc };
  }

  // Try to refresh (works only if your OAuth app has expiring tokens enabled)
  const refreshed = await refreshGithub(acc);
  if (!refreshed || !refreshed.access_token) {
    throw new Error("GitHub refresh not available; please reconnect GitHub");
  }

  return { accessToken: refreshed.access_token, account: refreshed };
}

export async function fetchRepoMetadata(repoOwner: string, repoName: string, accessToken: string) {
  return githubFetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, accessToken);
}

export async function fetchRepoIssues(repoOwner: string, repoName: string, accessToken: string) {
  return githubFetch(`https://api.github.com/search/issues?q=repo:${repoOwner}/${repoName}+type:issue`, accessToken);
}

export async function fetchRepoFileTree(url: string, accessToken: string) {
  let normalized = url
    .replace(/\{\/sha\}$/, "/HEAD")
    .replace(/\{sha\}$/, "/HEAD");

  // Collapse accidental double slashes but keep protocol intact (https://)
  normalized = normalized.replace(/([^:]\/)\/+/g, "$1");

  return githubFetch(`${normalized}?recursive=1`, accessToken);
}

export async function fetchRepoPR(repoOwner: string, repoName: string, accessToken: string) {
  let page = 1;
  const perPage = 100;
  let allPRs: RepoPRs[] = [];
  let hasMore = true;

  while (hasMore) {
    const headers = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "your-app-name",
      ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
    };
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=open&per_page=${perPage}&page=${page}`,
      {
        headers: headers
      });
    if (!response.ok) { 
      throw new Error(`Error fetching repo PRs: ${response.statusText}`);
    } 

    const Prs = await response.json();
    allPRs = allPRs.concat(Prs);

    hasMore = Prs.length === perPage;
    page++;
  }

  return allPRs;
}

const extensions = [".ts", ".tsx", ".json", ".md", ".env", ".yml", ".yaml"];

export async function filterFiles(fileTree: RepoFileTree) {
  if (!fileTree || !fileTree.tree) {
    throw new Error("Invalid GitHub tree response");
  }

  const filteredFiles = fileTree.tree.filter((file) => {
    if (file.type !== "blob") return false;

    return file.type === "blob" &&
    extensions.some((ext) => file.path.endsWith(ext)) &&
    !shouldIgnore(file.path);
  });

  return filteredFiles;
}