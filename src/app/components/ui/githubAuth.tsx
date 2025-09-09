import React from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import Image from 'next/image';

const GitHubAuth: React.FC = () => {
  const { data: session } = useSession();
  

  const handleLogin = () => {
    signIn("github", { callbackUrl: "/" });
  };

  const handleLogout = () => {
    signOut(); 
  };

  return (
    <div>
      {!session?.githubUser ? (
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
          <p>Welcome, {session?.githubUser?.name || "Github User"}</p>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      )}
    </div>
  );
};

export default GitHubAuth;