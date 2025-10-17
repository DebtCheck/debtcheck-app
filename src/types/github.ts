export type GitHubProfileLite = {
  name?: string;
  email?: string;
  login?: string;
};

export type GithubAccount = {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
  token_type: string | null;
};

export type Repo = {
  id: number;
  full_name: string;
  private: boolean;
  language: string | null;
  html_url: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
};

export type GithubReposResponse = {
  data: Repo[];
  hasNext: boolean;
  stale: boolean;
  source?: string;
  page: number;
};