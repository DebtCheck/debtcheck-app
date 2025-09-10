"use client";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignOutButton({ label = "Sign out" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut({ redirect: false });  // invalidate session (DB or JWT)
        router.refresh();                    // re-fetch /api/auth/session
      }}
    >
      {label}
    </button>
  );
}