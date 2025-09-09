// /app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import { OAuthConfig } from "next-auth/providers/oauth";
import { JiraProfile } from "@/types/jira";
import { GitHubProfileLite } from "@/types/github";
import { authOptions } from "@/lib/auth";

// --- Jira Provider (Atlassian) ---
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
