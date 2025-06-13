import { getLatestToken, setLatestToken } from "@/lib/tokenStore";
import { GitHubProfile, JiraAccessibleResource, JiraProfile } from "@/types/next-auth";
import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { OAuthConfig } from "next-auth/providers/oauth";

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
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      const previousToken = getLatestToken();

      if (account?.provider === "github" && profile) {
        token.githubAccessToken = account.access_token;
        token.githubUser = {
          name: profile.name ?? "",
          email: profile.email ?? "",
          login: (profile as GitHubProfile).login,
        };

        // garder Jira de la dernière session
        token.jiraAccessToken = previousToken.jiraAccessToken;
        token.jiraRefreshToken = previousToken.jiraRefreshToken;
        token.jiraCloudId = previousToken.jiraCloudId;
        token.jiraSite = previousToken.jiraSite;
      }

      if (account?.provider === "jira" && profile) {
        token.jiraAccessToken = account.access_token;
        token.jiraRefreshToken = account.refresh_token;
        token.jiraCloudId = (profile as JiraProfile).id;
        token.jiraSite = {
          name: token.name ?? "",
          image: token.picture ?? "",
        };

        // garder GitHub de la dernière session
        token.githubAccessToken = previousToken.githubAccessToken;
        token.githubUser = previousToken.githubUser;
      }

      setLatestToken(token);

      return token;
    },

    async session({ session, token }) {
      session.githubAccessToken = token.githubAccessToken;
      session.githubUser = token.githubUser;

      session.jiraAccessToken = token.jiraAccessToken;
      session.jiraRefreshToken = token.jiraRefreshToken;
      session.jiraCloudId = token.jiraCloudId;
      session.jiraSite = token.jiraSite;

      return session;
    },
  },
}

const handler =  NextAuth(authOptions);

export { handler as GET, handler as POST };