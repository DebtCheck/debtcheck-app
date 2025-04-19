import { analyzeRepo } from "@/lib/analyser";
import { fetchRepoFileTree, fetchRepoMetadata, filterFiles } from "@/lib/github";
import { RepoFileTree, RepoMetadata } from "@/types/repo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("repo");

  if (!url) {
    return new Response("Missing repo URL", { status: 400 });
  }

  try {
    const urlTest = "https://github.com/vercel/next.js";

    const res = await fetchRepoMetadata(urlTest);
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
      subscribers_count: res.subscribers_count,
      pulls_url: res.pulls_url,
      default_branch: res.default_branch,
      trees_url: res.trees_url,
    }

    const fileTree = await fetchRepoFileTree(metadata.trees_url);
    
    const resFiltered = await filterFiles(fileTree);
    const filteredFiles: RepoFileTree = {
      tree: resFiltered,
    }

    const analysis = await analyzeRepo(filteredFiles);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error fetching repo metadata" },
      { status: 500 }
    );
  }
}
