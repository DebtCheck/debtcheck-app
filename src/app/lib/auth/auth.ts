import { Account, NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import { OAuthConfig } from "next-auth/providers/oauth";
import { prisma } from "@/app/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

type JiraProfile = {
  account_id: string;
  name: string;
  email: string;
  picture: string;
}

export const JiraProvider: OAuthConfig<JiraProfile> = {
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
  userinfo: "https://api.atlassian.com/me",
  profile(me) {
    return {
      id: me.account_id,
      name: me.name ?? null,
      email: me.email ?? null,
      image: me.picture ?? null,
    };
  },
};

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