"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import BacklogModal from "./backlogModal";
import { Button } from "@/app/components/ui/utilities";
import { Report } from "@/app/types/report";

type Props = { report: Report };

export default function JiraControl({ report }: Props) {
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
        Connect Jira
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} aria-label="Create backlog">
        Create backlog
      </Button>
      <BacklogModal open={open} onClose={() => setOpen(false)} report={report} />
    </>
  );
}