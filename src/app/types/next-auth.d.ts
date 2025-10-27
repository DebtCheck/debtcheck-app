declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    providers?: { github: boolean; jira: boolean };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    github?: {
      accessToken: string;
      expiresAt: number | null;
    };
    githubUser?: {
      name?: string;
      email?: string;
      login?: string;
    };
    jira?: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
      scope?: string;
      cloudId?: string;
      error?: string;
    };
    jiraSite?: {
      name?: string;
      image?: string;
    };
  }
}

export type JiraAccessibleResource = {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl?: string;
};

export type GitHubProfile = {
  login: string;
  name: string;
  email: string;
};

export type JiraProfile = {
  id: string,
  name: string,
  image: string,
  email: string,
  cloudId: string,
}

export interface extendedToken {
  githubAccessToken?: string;
  jiraAccessToken?: string;
  jiraRefreshToken?: string;
  jiraCloudId?: string;
  githubUser?: GitHubProfile;
  jiraSite?: {
    name?: string;
    image?: string;
  };
}
