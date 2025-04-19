import { RepoFileTree } from "@/types/repo";

export async function analyzeRepo(files: RepoFileTree)  {
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