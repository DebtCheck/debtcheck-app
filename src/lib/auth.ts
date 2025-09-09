import { GitHubProfileLite } from "@/types/github";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";
import { OAuthConfig } from "next-auth/providers/oauth";
import { JiraProfile } from "@/types/jira";
type JiraAccessibleResource = {
  id: string;
  name: string;
  url: string;
  avatarUrl?: string;
  scopes: string[];
};

export function isJiraProfile(p: unknown): p is JiraProfile {
  return !!p && typeof (p as Record<string, unknown>).cloudId === "string";
}

export const isGitHubProfile = (p: unknown): p is GitHubProfileLite => {
  if (!p || typeof p !== "object") return false;
  const obj = p as Partial<GitHubProfileLite>;
  return typeof obj.login === "string" || typeof obj.name === "string";
};

export const JiraProvider: OAuthConfig<JiraAccessibleResource[]> = {
  id: "jira",
  name: "Jira",
  type: "oauth",
  clientId: process.env.JIRA_CLIENT_ID!,
  clientSecret: process.env.JIRA_CLIENT_SECRET!,
  authorization: {
    url: "https://auth.atlassian.com/authorize",
    params: {
      audience: "api.atlassian.com",
      scope: "read:jira-user read:jira-work write:jira-work read:me offline_access",
      prompt: "consent",
    },
  },
  token: "https://auth.atlassian.com/oauth/token",
  userinfo: "https://api.atlassian.com/oauth/token/accessible-resources",
  profile(resources) {
    const jira = resources.find(r => r.scopes?.includes("read:jira-work"));
    if (!jira) throw new Error("No accessible Jira site found");
    return {
      id: jira.id,
      name: jira.name,
      cloudId: jira.id,      // 🔑 make sure this is here
      jiraUrl: jira.url,
      image: jira.avatarUrl ?? null,
    };
  },
};

// --- helper: refresh Jira ---

export async function refreshAtlassianAccessToken(prev: JWT): Promise<JWT> {
  try {
    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: prev.jira?.refreshToken,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data: { access_token: string; expires_in: number; refresh_token?: string; scope?: string } = await res.json();

    return {
      ...prev,
      jira: {
        ...(prev.jira ?? {}),
        accessToken: data.access_token,
        expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600) - 60,
        refreshToken: data.refresh_token ?? prev.jira?.refreshToken,
        scope: data.scope ?? prev.jira?.scope,
      },
    };
  } catch {
    return {
      ...prev,
      jira: {
        ...(prev.jira ?? {}),
        accessToken: prev.jira?.accessToken ?? "", // keep string to satisfy types
        error: "RefreshAccessTokenError",
      },
    };
  }
}

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