// app/api/account/jira/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http/response";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return jsonError("Unauthorized", 401);

  const acc = await prisma.account.findFirst({
    where: { userId, provider: { in: ["atlassian", "jira"] } },
    select: { id: true, access_token: true, refresh_token: true },
  });
  if (!acc) return NextResponse.json({ ok: true });

  // Optional: revoke tokens at Atlassian (best-effort)
  try {
    const revoke = async (token: string, hint: "access_token" | "refresh_token") =>
      fetch("https://auth.atlassian.com/oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          token_type_hint: hint,
          client_id: process.env.JIRA_CLIENT_ID,
          client_secret: process.env.JIRA_CLIENT_SECRET,
        }),
      });

    if (acc.access_token) await revoke(acc.access_token, "access_token");
    if (acc.refresh_token) await revoke(acc.refresh_token, "refresh_token");
  } catch {}

  await prisma.account.delete({ where: { id: acc.id } });
  return NextResponse.json({ ok: true });
}
