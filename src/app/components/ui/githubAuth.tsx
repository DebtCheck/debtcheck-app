import React, { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

const GitHubAuth: React.FC = () => {
  const { data: session } = useSession(); 

  const [githubUser, setGitHubUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    if (session?.githubUser) {
      setGitHubUser(session.githubUser);
    } else {
      // Fallback to localStorage if session doesn't have data
      const stored = localStorage.getItem("githubUser");
      if (stored) {
        setGitHubUser(JSON.parse(stored));
      }
    }
  }, [session]);
  

  const handleLogin = () => {
    signIn('github');
  };

  const handleLogout = () => {
    signOut(); 
  };

  return (
    <div>
      {!session?.githubAccessToken ? (
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
          <p>Welcome, {githubUser?.name || "Github User"}</p>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      )}
    </div>
  );
};

export default GitHubAuth;