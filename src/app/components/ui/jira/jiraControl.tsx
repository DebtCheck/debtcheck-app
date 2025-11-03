"use client";

import { signIn, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import BacklogModal from "./backlogModal";
import { Button } from "@/app/components/ui/utilities";
import { Report } from "@/app/types/report";
import DisconnectJira from "./disconnectJira";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";

type Props = { report: Report };

export default function JiraControl({ report }: Props) {
  const t = useTranslations("Jira");
  const { status, data } = useSession();
  const jiraLinked = Boolean(data?.providers?.jira);

  const pathname = usePathname();
  const search = useSearchParams();

  const callbackUrl = useMemo(() => {
    return `${pathname}${search?.toString() ? `?${search.toString()}` : ""}`;
  }, [pathname, search]);

  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return <Button disabled>…</Button>;
  }

  if (!jiraLinked) {
    return (
      <Button
        onClick={() => signIn("jira", { callbackUrl })}
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