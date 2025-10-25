import { Button, Toolbar } from "../ui/utilities";
import { ActivitySection, DependenciesSection, IssuesPrsSection, RisksSection } from "./report-sections";
import { Report } from "@/app/types/report";

export default function DebtCheckReportView({ report }: { report: Report }) {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8 space-y-4">
      <Toolbar
        left={
          <h1 className="text-2xl font-semibold tracking-tight">
            Technical Debt Report
          </h1>
        }
        right={
          <Button
            onClick={() =>
              navigator.clipboard.writeText(JSON.stringify(report, null, 2))
            }
          >
            Copy JSON
          </Button>
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
