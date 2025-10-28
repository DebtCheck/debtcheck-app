"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import BacklogModal from "./backlogModal";
import { Button } from "@/app/components/ui/utilities";
import { Report } from "@/app/types/report";
import DisconnectJira from "./disconnectJira";
import { useTranslations } from "next-intl";

type Props = { report: Report };

export default function JiraControl({ report }: Props) {
  const t = useTranslations("Jira");
  const { status, data } = useSession();
  const jiraLinked = Boolean(data?.providers?.jira);

  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return <Button disabled>…</Button>;
  }

  if (!jiraLinked) {
    return (
      <Button
        onClick={() => signIn("jira", { callbackUrl: "/" })}
        aria-label="Connect Jira"
      >
        {t("connect")}
      </Button>
    );
  }

  return (
    <>
      <DisconnectJira />
      <Button onClick={() => setOpen(true)} aria-label={t("createBacklogAria")}>
        {t("createBacklog")}
      </Button>
      <BacklogModal open={open} onClose={() => setOpen(false)} report={report} />
    </>
  );
}