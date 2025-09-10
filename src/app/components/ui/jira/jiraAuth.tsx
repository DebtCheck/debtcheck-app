"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ConnectJiraButton() {

  const handleConnect = () => {
    signIn("jira", { callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
    >
      Connect to Jira
    </button>
  );
}


export function DisconnectJiraButton() {
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/jira", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to disconnect Jira:", data ?? res.statusText);
      }
      await update();       // <— refresh next-auth session
      router.refresh();  
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={disconnect}>{busy ? "Disconnecting…" : "Disconnect Jira"}</button>
  );
}