import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
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
}

declare module "next-auth/jwt" {
  interface JWT {
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
