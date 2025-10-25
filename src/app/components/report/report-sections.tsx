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

export function ActivitySection({
  updated,
  pushed,
}: {
  updated: AnalyzeStaleness;
  pushed: AnalyzeStaleness;
}) {
  return (
    <Collapsible
      title="Repository activity"
      right={
        <div className="flex gap-2">
          <PillFromBool
            okLabel="Fresh"
            warnLabel="Stale"
            warn={updated.stale}
          />
          <PillFromBool okLabel="Fresh" warnLabel="Stale" warn={pushed.stale} />
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Updated at" subtitle={updated.message}>
          <div className="flex items-center gap-2 text-sm">
            <Clock3 className="w-4 h-4" />
            <span>{updated.daysSinceUpdate} day(s) since last update</span>
          </div>
        </Section>
        <Section title="Pushed at" subtitle={pushed.message}>
          <div className="flex items-center gap-2 text-sm">
            <GitCommit className="w-4 h-4" />
            <span>{pushed.daysSinceUpdate} day(s) since last push</span>
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
  return (
    <Collapsible
      title="Issues & Pull Requests"
      right={
        <div className="flex gap-2">
          <StatusPill status={issues.isManyIssuesUnresolved ? "warning" : "ok"}>
            {Math.round(issues.issuesRatio * 100)}% open
          </StatusPill>
          <StatusPill status={prs.stalePRsCount > 0 ? "warning" : "ok"}>
            {prs.stalePRsCount} stale PRs
          </StatusPill>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatBadge
          label="Open issues ratio"
          value={`${Math.round(issues.issuesRatio * 100)}%`}
          hint={issues.message}
        />
        <StatBadge
          label="Stale PRs (≥30d)"
          value={prs.stalePRsCount}
          hint={prs.message}
        />
        <Card>
          <CardContent>
            <Toolbar
              left={
                <div className="flex items-center gap-2 text-sm">
                  <GitPullRequest className="w-4 h-4" />
                  Quality hints
                </div>
              }
            />
            <ul className="mt-3 text-sm list-disc pl-5 text-muted-foreground">
              <li>Close resolved issues to keep the ratio healthy.</li>
              <li>Review/merge or close stale PRs regularly.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Collapsible>
  );
}

export function DependenciesSection({ items }: { items: DeprecatedLibs[] }) {
  const columns: Column<DeprecatedLibs & { _status: DepStatus }>[] = [
    {
      key: "name",
      header: "Package",
      width: "40%",
      render: (r) => <span className="break-all font-medium">{r.name}</span>,
    },
    { key: "current", header: "Current" },
    { key: "latest", header: "Latest" },
    {
      key: "deprecated",
      header: "Deprecated",
      width: 110,
      render: (r) =>
        r.deprecated ? (
          <span className="text-red-700">yes</span>
        ) : (
          <span className="text-muted-foreground">no</span>
        ),
    },
    {
      key: "_status",
      header: "Status",
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
    <Collapsible title="Dependencies" right={<StatusPill status={worst} />}>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.name}@${r.current}`}
      />
    </Collapsible>
  );
}

export function RisksSection({ rust }: { rust?: RustAnalysisReport }) {
  // No Rust report at all
  if (!rust) {
    return (
      <Collapsible
        title="Risks & hygiene"
        right={<StatusPill status="neutral">No code scan</StatusPill>}
      >
        <InlineAlert
          variant="info"
          title="No static analysis"
          description="This report did not include Rust analysis results."
        />
      </Collapsible>
    );
  }

  console.log("Rust analysis report:", rust);

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
      title="Risks & hygiene"
      right={<StatusPill status={overall} />}
    >
      <div className="grid gap-4">
        {hasSecretsReport &&
          (secretsArray.length > 0 ? (
            <InlineAlert
              variant="warning"
              title={`Potential secrets found: ${secretsArray.length}`}
              description="Review and rotate keys if confirmed. Tests and placeholders can be ignored when safe rules apply."
            />
          ) : (
            <InlineAlert
              variant="success"
              title="No secrets detected"
              description="Static scan did not find suspicious values."
            />
          ))}

        {env && (
          <InlineAlert
            variant="info"
            title={".env-like files present"}
            description={
              "Sensitive configuration files are committed in the repo."
            }
          />
        )}

        {hasParse && (
          <Section
            title="Dead code summary"
            subtitle="Identifiers declared but never used"
          >
            <div className="grid grid-cols-3 gap-4">
              <StatBadge
                label="Unused declarations"
                value={deadArray.length}
                variant={deadArray.length > 0 ? "warning" : "success"}
              />
              <StatBadge
                label="Secrets"
                value={secretsArray.length}
                variant={secretsArray.length > 0 ? "danger" : "success"}
              />
              <StatBadge
                label=".env present"
                value={env ? "yes" : "no"}
                variant={env ? "info" : "neutral"}
              />
            </div>
          </Section>
        )}

        {hasSecretsReport && (
          <Collapsible
            title="Secrets details"
            defaultOpen={hasSecretsReport ? true : false}
          >
            <DataTable
              columns={[
                {
                  key: "file",
                  header: "File",
                  width: "40%",
                  render: (s: SecretItem) => (
                    <span className="break-all">{s.file}</span>
                  ),
                },
                { key: "name", header: "Name" },
                { key: "kind", header: "Kind" },
                {
                  key: "value_preview",
                  header: "Preview",
                  width: "30%",
                  render: (s: SecretItem) => (
                    <code className="text-xs break-all">{s.value_preview}</code>
                  ),
                },
                { key: "line", header: "Line", align: "right" },
              ]}
              rows={secretsArray}
              rowKey={(s) => `${s.file}:${s.line}:${s.column}`}
              emptyState={
                <Card className="p-4 text-sm">No secrets detected.</Card>
              }
            />
          </Collapsible>
        )}

        {hasDeadReport && (
          <Collapsible
            title="Dead code details"
            defaultOpen={hasDeadReport ? true : false}
          >
            <DataTable
              columns={[
                {
                  key: "file",
                  header: "File",
                  width: "40%",
                  render: (d: DeadCodeItem) => (
                    <span className="break-all">{d.file}</span>
                  ),
                },
                { key: "name", header: "Identifier" },
                { key: "kind", header: "Kind" },
                { key: "line", header: "Line", align: "right" },
                { key: "column", header: "Column", align: "right" },
              ]}
              rows={deadArray}
              rowKey={(d) => `${d.file}:${d.line}:${d.column}:${d.name}`}
              emptyState={
                <Card className="p-4 text-sm">No dead code detected.</Card>
              }
            />
          </Collapsible>
        )}
      </div>
    </Collapsible>
  );
}
