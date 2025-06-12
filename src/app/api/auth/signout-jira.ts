import { NextResponse } from "next/server";

export async function GET() {
  // If you're storing session server-side, you can clear Jira tokens from DB
  // Here, just simulate on frontend
  return NextResponse.json({ success: true });
}