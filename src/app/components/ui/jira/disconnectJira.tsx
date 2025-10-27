"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../utilities";

export default function DisconnectJira() {
  const { update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/jira", { method: "DELETE" });
      if (!res.ok) console.error(await res.json());
      await update();        // recompute session.providers
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={busy}>
      {busy ? "Disconnecting…" : "Disconnect Jira"}
    </Button>
  );
}