export interface  RepoMetadata {
  owner: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number; 
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;  
  total_issues_count: number;
  subscribers_count: number;
  pulls_url: string;  
  default_branch: string;
  trees_url: string;
}

export interface RepoFileTree {
  tree: {
    path: string;
    type: string;
    mode: string;
    sha: string;
  }[];
}

export interface RepoPRs {
  created_at: string;
  number: number;
  title: string;
  html_url: string;
}