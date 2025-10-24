import React, { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from "next/navigation";

const GitHubAuth: React.FC = () => {
  const { data: session, update } = useSession();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const githubLinked = !!session?.providers?.github;
  

  const handleLogin = () => {
    signIn("github", { callbackUrl: "/" });
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/github", { method: "DELETE" });
      // Optional: handle errors
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to disconnect GitHub:", data ?? res.statusText);
      }
      await update();       // <— refresh next-auth session
      router.refresh();
    } finally {
      setBusy(false);
    }
  };


  return (
    <div>
      {!githubLinked ? (
        <button
          onClick={handleLogin}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#333',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          title="Login with GitHub"
        >
          <Image
            src="/github.svg"
            alt="GitHub Logo"
            width={24}
            height={24}
          />
        </button>
      ) : (
        <div>
          <p>Welcome, {session.user.name || "Github User"}</p>
          <button onClick={disconnect}>{busy ? "Disconnecting…" : "Disconnect GitHub"}</button>
        </div>
      )}
    </div>
  );
};

export default GitHubAuth;