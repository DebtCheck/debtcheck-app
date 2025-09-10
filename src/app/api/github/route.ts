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
    where: { userId, provider: "github" },
    select: { id: true, access_token: true },
  });
  if (!acc) return NextResponse.json({ ok: true });

  // Optional: revoke GitHub token via OAuth App API (requires app creds):
  await fetch(`https://api.github.com/applications/${process.env.GITHUB_ID}/token`, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Basic " + btoa(`${process.env.GITHUB_ID}:${process.env.GITHUB_SECRET}`)
    },
    body: JSON.stringify({ access_token: acc.access_token })
  });

  await prisma.account.delete({ where: { id: acc.id } });
  return NextResponse.json({ ok: true });
}