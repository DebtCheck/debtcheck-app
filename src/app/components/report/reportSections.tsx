import {
  AnalyzeIssues,
  AnalyzePrs,
  AnalyzeStaleness,
  asDepStatus,
  DeadCodeItem,
  DeprecatedLibs,
  DepStatus,
  RustAnalysisReport,
  SecretItem,
} from "@/app/types/report";
import { Collapsible } from "../ui/utilities/data-display/collapsible";
import {
  Card,
  CardContent,
  Column,
  DataTable,
  InlineAlert,
  PillFromBool,
  Section,
  StatBadge,
  StatusPill,
  Toolbar,
} from "../ui/utilities";
import { Clock3, GitCommit, GitPullRequest } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { HelpTip } from "../ui/utilities/base/tip/helpTip";
import { LabelWithTip } from "../ui/utilities/base/tip/labelWithTip";

export function ActivitySection({
  updated,
  pushed,
}: {
  updated: AnalyzeStaleness;
  pushed: AnalyzeStaleness;
}) {
  const t = useTranslations("Report.activity");
  return (
    <Collapsible
      title={
        <div className="inline-flex items-center gap-2">
          {t("title")}
          <HelpTip content={t("help.main")} />
        </div>
      }
      right={
        <div className="flex gap-2">
          <PillFromBool
            okLabel={t("fresh")}
            warnLabel={t("stale")}
            warn={updated.stale}
          />
          <PillFromBool
            okLabel={t("fresh")}
            warnLabel={t("stale")}
            warn={pushed.stale}
          />
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title={
            <LabelWithTip
              label={t("updatedAt")}
              tip={t("help.updatedAt")}
              ariaLabel="Help: Updated At"
            />
          }
          className="bg-[rgb(var(--surface-2))] border-(--line-neutral-15)"
        >
          <div className="flex items-center gap-2 text-sm">
            <Clock3 className="w-4 h-4" />
            <span>{t("sinceUpdate", { count: updated.daysSinceUpdate })}</span>
          </div>
        </Section>
        <Section
          title={
            <LabelWithTip
              label={t("pushedAt")}
              tip={t("help.pushedAt")}
              ariaLabel="Help: Pushed At"
            />
          }
          className="bg-[rgb(var(--surface-2))] border-(--line-neutral-15)"
        >
          <div className="flex items-center gap-2 text-sm">
            <GitCommit className="w-4 h-4" />
            <span>{t("sincePush", { count: pushed.daysSinceUpdate })}</span>
          </div>
        </Section>
      </div>
    </Collapsible>
  );
}

export function IssuesPrsSection({
  issues,
  prs,
}: {
  issues: AnalyzeIssues;
  prs: AnalyzePrs;
}) {
  const t = useTranslations("Report.issuesPrs");
  const isClean = issues.issuesRatio < 0.1 && prs.stalePRsCount === 0;
  return (
    <Collapsible
      title={
        <div className="inline-flex items-center gap-2">
          {t("title")}
          <HelpTip content={t("help.main")} />
        </div>
      }
      right={
        <div className="flex gap-2">
          <StatusPill status={issues.isManyIssuesUnresolved ? "warning" : "ok"}>
            {t("openPct", { pct: Math.round(issues.issuesRatio * 100) })}
          </StatusPill>
          <StatusPill status={prs.stalePRsCount > 0 ? "warning" : "ok"}>
            {t("stalePrs", { count: prs.stalePRsCount })}
          </StatusPill>
        </div>
      }
    >
      <div className="flex gap-4 md:grid md:grid-cols-2">
        <StatBadge
          label={
            <LabelWithTip
              label={t("openIssuesRatio")}
              tip={t("help.openIssuesRatio")}
            />
          }
          value={`${Math.round(issues.issuesRatio * 100)}%`}
          className="bg-[rgb(var(--surface-2))]"
        />
        <StatBadge
          label={
            <LabelWithTip
              label={t("stalePrs_30")}
              tip={t("help.stalePrs_30")}
            />
          }
          value={prs.stalePRsCount}
          className="bg-[rgb(var(--surface-2))]"
        />
        {isClean ? null : (
          <Card className="bg-[rgb(var(--surface-2))] border-(--line-neutral-15)">
            <CardContent>
              <Toolbar
                left={
                  <div className="flex items-center gap-2 text-sm">
                    <GitPullRequest className="w-4 h-4" />
                    {t("hintsTitle")}
                  </div>
                }
              />
              <ul className="mt-3 text-sm list-disc pl-5 text-muted-foreground">
                <li>{t("hintCloseIssues")}</li>
                <li>{t("hintReviewPrs")}</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Collapsible>
  );
}

export function DependenciesSection({ items }: { items: DeprecatedLibs[] }) {
  const t = useTranslations("Report.deps");
  const columns: Column<DeprecatedLibs & { _status: DepStatus }>[] = [
    {
      key: "name",
      header: t("package"),
      width: "40%",
      render: (r) => <span className="break-all font-medium">{r.name}</span>,
    },
    { key: "current", header: t("current") },
    { key: "latest", header: t("latest") },
    {
      key: "deprecated",
      header: t("deprecated"),
      width: 110,
      render: (r) =>
        r.deprecated ? (
          <span className="text-red-700">{t("yes")}</span>
        ) : (
          <span className="text-muted-foreground">{t("no")}</span>
        ),
    },
    {
      key: "_status",
      header: t("status"),
      width: 120,
      render: (r) => <StatusPill status={r._status} />,
    },
  ];
  const rows = useMemo(
    () => items.map((it) => ({ ...it, _status: asDepStatus(it.status) })),
    [items]
  );

  const worst: DepStatus = rows.some((r) => r._status === "error")
    ? "error"
    : rows.some((r) => r._status === "warning")
    ? "warning"
    : "ok";

  return (
    <Collapsible
      title={
        <div className="inline-flex items-center gap-2">
          {t("title")}
          <HelpTip content={t("help.main")} />
        </div>
      }
      right={
        <div className="inline-flex items-center gap-1">
          <StatusPill status={worst} />
          <HelpTip content={t("help.overall")} />
        </div>
      }
    >
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.name}@${r.current}`}
      />
    </Collapsible>
  );
}

export function RisksSection({ rust }: { rust?: RustAnalysisReport }) {
  const t = useTranslations("Report.risks");

  if (!rust) {
    return (
      <Collapsible
        title={
          <div className="inline-flex items-center gap-2">
            {t("title")}
            <HelpTip content={t("help.main")} />
          </div>
        }
        right={<StatusPill status="neutral">{t("noScanPill")}</StatusPill>}
      >
        <InlineAlert
          variant="info"
          title={t("noScanTitle")}
          description={t("noScanDesc")}
        />
      </Collapsible>
    );
  }

  const hasParse = Boolean(rust.report_parse);
  const secretsArray: SecretItem[] = Array.isArray(rust.report_parse?.env_vars)
    ? rust.report_parse!.env_vars
    : [];
  const deadArray: DeadCodeItem[] = Array.isArray(rust.report_parse?.dead_code)
    ? rust.report_parse!.dead_code
    : [];
  const hasSecretsReport = Array.isArray(rust.report_parse?.env_vars);
  const hasDeadReport = Array.isArray(rust.report_parse?.dead_code);
  const env = Boolean(rust.is_env_present);

  // Overall severity only considers signals that exist
  const anyIssues = (hasSecretsReport && secretsArray.length > 0) || env;
  const overall: DepStatus = anyIssues ? "warning" : "ok";

  return (
    <Collapsible
      title={
        <div className="inline-flex items-center gap-2">
          {t("title")}
          <HelpTip content={t("help.main")} />
        </div>
      }
      right={<StatusPill status={overall} />}
    >
      <div className="grid gap-4">
        {hasSecretsReport &&
          (secretsArray.length > 0 ? (
            <div className="flex items-start gap-2">
              <InlineAlert
                variant="warning"
                title={t("secretsFound", { count: secretsArray.length })}
                description={t("secretsAdvice")}
              />
              <HelpTip content={t("help.secretsFound")} />
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <InlineAlert
                variant="success"
                title={t("noSecretsTitle")}
                description={t("noSecretsDesc")}
              />
              <HelpTip content={t("help.noSecrets")} />
            </div>
          ))}

        {env && (
          <div className="flex items-start gap-2">
            <InlineAlert
              variant="info"
              title={t("envTitle")}
              description={t("envDesc")}
            />
            <HelpTip content={t("help.envPresent")} />
          </div>
        )}

        {hasParse && (
          <Section
            title={
              <LabelWithTip
                label={t("deadSummaryTitle")}
                tip={t("help.deadSummary")}
              />
            }
            subtitle={t("deadSummarySub")}
          >
            <div className="grid grid-cols-3 gap-4">
              <StatBadge
                label={
                  <LabelWithTip
                    label={t("unusedDecl")}
                    tip={t("help.unusedDecl")}
                  />
                }
                value={deadArray.length}
                variant={deadArray.length > 0 ? "warning" : "success"}
              />
              <StatBadge
                label={
                  <LabelWithTip
                    label={t("secrets")}
                    tip={t("help.secretsStat")}
                  />
                }
                value={secretsArray.length}
                variant={secretsArray.length > 0 ? "danger" : "success"}
              />
              <StatBadge
                label={
                  <LabelWithTip
                    label={t("envPresent")}
                    tip={t("help.envStat")}
                  />
                }
                value={env ? "yes" : "no"}
                variant={env ? "info" : "neutral"}
              />
            </div>
          </Section>
        )}

        {hasSecretsReport && (
          <Collapsible
            title={t("secretsDetails")}
            defaultOpen={hasSecretsReport ? true : false}
          >
            <DataTable
              columns={[
                {
                  key: "file",
                  header: t("file"),
                  width: "40%",
                  render: (s: SecretItem) => (
                    <span className="break-all">{s.file}</span>
                  ),
                },
                { key: "name", header: t("name") },
                { key: "kind", header: t("kind") },
                {
                  key: "value_preview",
                  header: t("preview"),
                  width: "30%",
                  render: (s: SecretItem) => (
                    <code className="text-xs break-all">{s.value_preview}</code>
                  ),
                },
                { key: "line", header: t("line"), align: "right" },
                { key: "column", header: t("column"), align: "right" },
              ]}
              rows={secretsArray}
              rowKey={(s) => `${s.file}:${s.line}:${s.column}`}
              emptyState={
                <Card className="p-4 text-sm">{t("emptySecrets")}</Card>
              }
            />
          </Collapsible>
        )}

        {hasDeadReport && (
          <Collapsible
            title={t("deadDetails")}
            defaultOpen={hasDeadReport ? true : false}
          >
            <DataTable
              columns={[
                {
                  key: "file",
                  header: t("file"),
                  width: "40%",
                  render: (d: DeadCodeItem) => (
                    <span className="break-all">{d.file}</span>
                  ),
                },
                { key: "name", header: t("identifier") },
                { key: "kind", header: t("kind") },
                { key: "line", header: t("line"), align: "right" },
                { key: "column", header: t("column"), align: "right" },
              ]}
              rows={deadArray}
              rowKey={(d) => `${d.file}:${d.line}:${d.column}:${d.name}`}
              emptyState={<Card className="p-4 text-sm">{t("emptyDead")}</Card>}
            />
          </Collapsible>
        )}
      </div>
    </Collapsible>
  );
}
