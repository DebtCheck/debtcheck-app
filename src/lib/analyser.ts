import { RepoFileTree, RepoMetadata } from "@/types/repo";
import { AnalyzeStaleness } from "@/types/report";

export async function analyzeFileTree(files: RepoFileTree)  {
  const response = await fetch(`${process.env.RUST_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(files),
  });

  if (!response.ok) {
    throw new Error(`Error analyzing repo: ${response.statusText}`);
  } 

  return response.json();
}

export async function analyzeMetadata(metadata: RepoMetadata) {
  console.log(metadata);
  const updatedAtAnalisis: AnalyzeStaleness =  analyzeStaleness(metadata.updated_at, "updated_at"); 
  const pushedAtAnalisis: AnalyzeStaleness = analyzeStaleness(metadata.pushed_at, "pushed_at");
  console.log(updatedAtAnalisis);
  console.log(pushedAtAnalisis);
  
}

function analyzeStaleness(dateStr: string, label: string) {
  console.log(dateStr);
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
      ? `⚠️ ${label} is stale: last activity was ${daysAgo} days ago.`
      : `✅ ${label} is fresh: last activity was ${daysAgo} days ago.`,
  }
}