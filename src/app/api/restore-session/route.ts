
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  // Save to DB, user store, Redis, etc.
  console.log("Restored:", body);

  return NextResponse.json({ ok: true });
}