"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ConnectJiraButton() {
  const { data: session } = useSession();

  const [jiraSite, setJiraSite] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    if (session?.jiraSite) {
      setJiraSite(session.jiraSite);
    } else {
      const stored = localStorage.getItem("jiraSite");
      if (stored) {
        setJiraSite(JSON.parse(stored));
      }
    }
  }, [session]);

  const handleConnect = async () => {
    await signIn("jira");
  };

  const handleLogout = () => {
      signOut(); 
    };

  if (session?.jiraAccessToken) {
    return (
      <div className="p-2 text-green-600 font-semibold flex flex-col">
        ✅ {jiraSite?.name ?? "Jira User"} Connected 
        <button onClick={handleLogout}> Sign out</button>
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
