import { RepoFileTree } from "@/types/repo";

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/)?$/);
  if (!match) return null;

  const [, owner, repo] = match;
  return { owner, repo };
}

export async function fetchRepoMetadata(repoUrl: string) {

  const parsedUrl = parseGitHubUrl(repoUrl);  

  if (!parsedUrl) {
    throw new Error("Invalid GitHub URL");
  }

  const response = await fetch(`https://api.github.com/repos/${parsedUrl?.owner}/${parsedUrl?.repo}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      // "Authorization": `Bearer ${token}`, // Uncomment if you need authentication
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching repo metadata: ${response.statusText}`);
  }

  const metadata = await response.json();
  return metadata;
}

export async function fetchRepoFileTree(url: string) {
  url = url.replace(/{\/sha}$/, "/HEAD");
  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      // "Authorization": `Bearer ${token}`, // Uncomment if you need authentication
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching repo file tree: ${response.statusText}`);
  }
  const fileTree = await response.json();
  return fileTree;
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