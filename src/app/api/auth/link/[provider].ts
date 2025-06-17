import { getToken } from "next-auth/jwt";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { provider } = req.query;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return res.redirect(`/api/auth/signin/${provider}`);
  }

  // Already authenticated — continue to OAuth flow
  return res.redirect(
    `/api/auth/signin/${provider}?callbackUrl=/auth/link/callback`
  );
}