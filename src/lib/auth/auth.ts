import { GitHubProfileLite } from "@/types/github";
import { Account, NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GitHub from "next-auth/providers/github";
import { OAuthConfig } from "next-auth/providers/oauth";
import { JiraProfile } from "@/types/jira";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // small cookie, accounts stored in DB
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { scope: "read:user repo read:org", prompt: "consent" } },
    }),
    JiraProvider,
  ],
  callbacks: {
    // Add useful flags to the session so the client knows what’s linked
    async session({ session, user }) {
      // session.user.id for convenience
      session.user.id = user.id;

      const accounts: Pick<Account, "provider">[] = await prisma.account.findMany({
        where: { userId: user.id },
        select: { provider: true },
      });
      const has = (p: "github" | "atlassian" | "jira") => accounts.some((a) => a.provider === p);
      session.providers = {
        github: has("github"),
        jira: has("atlassian") || has("jira"),
      };
      return session;
    },
  },
};