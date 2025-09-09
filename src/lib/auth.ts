import { isGitHubProfile, isJiraProfile, JiraProvider, refreshAtlassianAccessToken } from "@/app/api/auth/[...nextauth]/route";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  debug: true,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { scope: "read:user repo read:org", prompt: "consent" } },
    }),
    JiraProvider,
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Always start by copying the previous token
      let next: JWT = { ...token };

      if (account?.provider === "github") {
        console.log("[jwt] signing in with GitHub");
        next = {
          ...next,
          github: {
            accessToken: account.access_token!,         // set/replace only GitHub block
            expiresAt: account.expires_at ?? null,
          },
          githubUser: isGitHubProfile(profile)
            ? { name: profile.name, email: profile.email, login: profile.login }
            : { name: "", email: "", login: "" },
        };
      }

      if (account?.provider === "jira") {
        console.log("[jwt] signing in with Jira");
        next = {
          ...next,
          jira: {
            ...(next.jira ?? {}),
            accessToken: account.access_token!,
            refreshToken: account.refresh_token!,
            expiresAt: account.expires_at!,
            scope: account.scope,
            cloudId: isJiraProfile(profile) ? profile.cloudId : next.jira?.cloudId,
          },
          jiraSite: {
            name: (next.name as string) ?? "",
            image: (next.picture as string) ?? "",
          },
        };
      }

      // Refresh Jira if needed (this preserves GitHub fields)
      if (next.jira?.expiresAt && Math.floor(Date.now() / 1000) > next.jira.expiresAt) {
        next = await refreshAtlassianAccessToken(next);
      }

      console.log("[jwt] merged token providers:", {
        hasGH: !!next.github?.accessToken,
        hasJira: !!next.jira?.accessToken,
      });

      return next;
    },

    async session({ session, token }) {
      session.providers = {
        github: Boolean(token.github?.accessToken),
        jira: Boolean(token.jira?.accessToken) && !token.jira?.error,
      };
      session.githubUser = token.githubUser;
      session.jiraCloudId = token.jira?.cloudId;
      session.jiraSite = token.jiraSite;
      return session;
    },
  },
};