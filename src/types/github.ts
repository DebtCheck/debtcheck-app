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