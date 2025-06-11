import { analyzeFileTree, analyzeMetadata } from "@/lib/analyser";
import { fetchRepoFileTree, fetchRepoMetadata, filterFiles } from "@/lib/github";
import { RepoFileTree, RepoMetadata } from "@/types/repo";
import { Report } from "@/types/report";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { repoUrl } = await req.json()

  if (!repoUrl) {
    return new Response("Missing repo URL", { status: 400 });
  }

  try {
    const res = await fetchRepoMetadata(repoUrl	);
    
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

    const fileTree = await fetchRepoFileTree(metadata.trees_url);
    
    const resFiltered = await filterFiles(fileTree);
    const filteredFiles: RepoFileTree = {
      tree: resFiltered,
    }
    // console.log("Filtered files:", filteredFiles);  
    

    const resReport = await analyzeMetadata(metadata);

    const analysis = await analyzeFileTree(filteredFiles);

    const report: Report = {
      updatedAtReport: resReport.updatedAtReport,
      pushedAtReport: resReport.pushedAtReport,
      issuesReport: resReport.issuesReport,
      prsReport: resReport.prsReport,
      fileTreeReport: analysis,
    }
    

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error processing repo" },
      { status: 500 }
    );
  }
}
