import { GitHubProfile, JiraAccessibleResource, JiraProfile } from "@/types/next-auth";
import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { OAuthConfig } from "next-auth/providers/oauth";

// const JiraProvider: OAuthConfig<JiraProfile> = {
//   id: "jira",
//   name: "Jira",
//   type: "oauth",
//   version: "2.0",
//   wellKnown: "https://auth.atlassian.com/.well-known/openid-configuration",
//   clientId: process.env.JIRA_CLIENT_ID!,
//   clientSecret: process.env.JIRA_CLIENT_SECRET!,
//   authorization: {
//     url: "https://auth.atlassian.com/authorize",
//     params: {
//       client_id: process.env.JIRA_CLIENT_ID!,
//       response_type: "code",
//       scope: "read:jira-user read:jira-work write:jira-work offline_access",
//       prompt: "consent",
//     },
//   },
//   token: "https://auth.atlassian.com/oauth/token",
//   userinfo: "https://api.atlassian.com/me",
//   checks: ["none"], // 👈 THIS LINE fixes the issue
//   profile(profile) {
//     return {
//       id: profile.account_id,
//       name: profile.name,
//       email: profile.email,
//       image: null,
//     };
//   },
// };

const JiraProvider: OAuthConfig<JiraAccessibleResource[]> = {
  id: "jira",
  name: "Jira",
  type: "oauth",
  clientId: process.env.JIRA_CLIENT_ID!,
  clientSecret: process.env.JIRA_CLIENT_SECRET!,
  authorization: {
    url: "https://auth.atlassian.com/authorize",
    params: {
      client_id: process.env.JIRA_CLIENT_ID!,
      response_type: "code",
      scope: "read:jira-user read:jira-work write:jira-work offline_access",
      prompt: "consent",
    },
  },
  token: "https://auth.atlassian.com/oauth/token",
  userinfo: "https://api.atlassian.com/oauth/token/accessible-resources",
  profile(resources) {
    const jira = resources.find(
      (r) => r.id && r.url && r.scopes?.includes("read:jira-work")
    );

    if (!jira) {
      throw new Error("No accessible Jira site found for this user.");
    }

    return {
      id: jira.id,
      name: jira.name ?? "Jira Site",
      email: "", // not available
      image: jira.avatarUrl ?? null,
    };
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user repo read:org", 
          prompt: "consent",
        },
      },
    }),
    JiraProvider
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      
      
      if (account?.provider === "github" && profile) {
        token.githubAccessToken = account.access_token;
        token.githubUser = {
          name: profile.name ?? "",
          email: profile.email ?? "",
          login: (profile as GitHubProfile).login,
        };
      }

      if (account?.provider === "jira" && profile) {
        token.jiraAccessToken = account.access_token;
        token.jiraRefreshToken = account.refresh_token;
        token.jiraCloudId = (profile as JiraProfile).id;
        token.jiraSite = {
          name: token.name ?? "",
          image: token.picture ?? "",
        };
      }

      return token;
    },
    async session({ session, token }) {
      session.githubAccessToken = token.githubAccessToken;
      session.jiraAccessToken = token.jiraAccessToken;
      session.jiraCloudId = token.jiraCloudId;
      

      session.githubUser = token.githubUser;
      session.jiraSite = token.jiraSite;

      return session;
    }
  }
}

const handler =  NextAuth(authOptions);

export { handler as GET, handler as POST };