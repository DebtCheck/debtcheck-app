"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../utilities";
import { useTranslations } from "next-intl";

export default function DisconnectJira() {
  const t = useTranslations("Jira");
  const { update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/jira", { method: "DELETE" });
      if (!res.ok) console.error(await res.json());
      await update();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={busy}>
      {busy ? t("disconnectBusy") : t("disconnect")}
    </Button>
  );
}