"use client";

import JiraControl from "@/app/components/ui/jira/jiraControl";
import { Button, Toolbar } from "../ui/utilities";
import {
  ActivitySection,
  DependenciesSection,
  IssuesPrsSection,
  RisksSection,
} from "./reportSections";
import { Report } from "@/app/types/report";
import { useTranslations } from "next-intl";

export function ReportPage({ report }: { report: Report }) {
  const t = useTranslations("Report");
  return (
    <div className="mx-auto w-full md:p-10 space-y-4">
      <Toolbar
        left={
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
        }
        right={
          <div className="flex items-center space-x-2">
            <JiraControl report={report} />
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  JSON.stringify(report, null, 2)
                );
                const button = document.activeElement as HTMLButtonElement;
                const originalText = button.textContent;
                button.textContent = "Copied!";
                setTimeout(() => {
                  button.textContent = originalText;
                }, 2000);
              }}
            >
              {t("copy.btn")}
            </Button>
          </div>
        }
      />

      <ActivitySection
        updated={report.updatedAtReport}
        pushed={report.pushedAtReport}
      />
      <IssuesPrsSection issues={report.issuesReport} prs={report.prsReport} />
      <DependenciesSection
        items={report.rustAnalysisReport?.deprecated_libs ?? []}
      />
      <RisksSection rust={report.rustAnalysisReport} />
    </div>
  );
}
