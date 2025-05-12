import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { RepoFileTree, RepoPRs } from "@/types/repo";
import { getServerSession } from "next-auth/next";

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/)?$/);
  if (!match) return null;

  const [, owner, repo] = match;
  return { owner, repo };
}

export async function fetchRepoMetadata(repoUrl: string) {
  const session = await getServerSession(authOptions);

  const parsedUrl = parseGitHubUrl(repoUrl);  

  if (!parsedUrl) {
    throw new Error("Invalid GitHub URL");
  }

  const response = await fetch(`https://api.github.com/repos/${parsedUrl?.owner}/${parsedUrl?.repo}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": session?.accessToken ? `Bearer ${session?.accessToken}` : "",
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching repo metadata: ${response.statusText}`);
  }

  const metadata = await response.json();

  metadata.total_issues_count = await fetchRepoIssues(repoUrl).then((issues) => issues.total_count);

  return metadata;
}

export async function fetchRepoIssues(repoUrl: string) {
  const session = await getServerSession(authOptions);

  const parsedUrl = parseGitHubUrl(repoUrl);

  if (!parsedUrl) {
    throw new Error("Invalid GitHub URL");
  }

  const response = await fetch(`https://api.github.com/search/issues?q=repo:${parsedUrl?.owner}/${parsedUrl?.repo}+type:issue`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": session?.accessToken ? `Bearer ${session?.accessToken}` : ""
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching repo issues: ${response.statusText}`);
  }
  const issues = await response.json();
  return issues;
}

export async function fetchRepoFileTree(url: string) {
  const session = await getServerSession(authOptions);

  url = url.replace(/{\/sha}$/, "/HEAD");
  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": session?.accessToken ? `Bearer ${session?.accessToken}` : ""
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching repo file tree: ${response.statusText}`);
  }
  const fileTree = await response.json();
  return fileTree;
}

export async function fetchRepoPR(owner: string, name: string) {
  const session = await getServerSession(authOptions);
  let page = 1;
  const perPage = 100;
  let allPRs: RepoPRs[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${name}/pulls?state=open&per_page=${perPage}&page=${page}`,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": session?.accessToken ? `Bearer ${session?.accessToken}` : ""
        },
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

  if(!fileTree || !fileTree.tree) {
    throw new Error("Invalid GitHub tree response");
  }

  const filteredFiles = fileTree.tree.filter(
    (file) =>
      file.type === 'blob' &&
      extensions.some((ext) => file.path.endsWith(ext))
  );
  return filteredFiles;
}