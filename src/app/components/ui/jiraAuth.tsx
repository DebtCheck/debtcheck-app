"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function ConnectJiraButton() {
  const { data: session } = useSession();
  const jiraLinked = !!session?.providers?.jira;

  const handleConnect = () => {
    signIn("jira", { callbackUrl: "/" });
  };

  const handleLogout = () => {
    signOut();
  };

  if (jiraLinked) {
    return (
      <div className="p-2 text-green-600 font-semibold flex items-center gap-3">
        <span>✅ {jiraLinked ?? "Jira Connected"}</span>
        <button onClick={handleLogout} className="underline">Sign out</button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
    >
      Connect to Jira
    </button>
  );
}
