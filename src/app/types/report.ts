export interface Report {
  id: string;
  updatedAtReport: AnalyzeStaleness;
  pushedAtReport: AnalyzeStaleness;
  issuesReport: AnalyzeIssues;
  prsReport: AnalyzePrs;
  rustAnalysisReport?: RustAnalysisReport;
}

export interface AnalyzeStaleness {
  label: string;
  stale: boolean;
  daysSinceUpdate: number;
  message: string;
}

export interface AnalyzeIssues {
  issuesRatio: number;
  isManyIssuesUnresolved: boolean;
  message: string;
}

export interface AnalyzePrs {
  stalePRsCount: number;
  message: string;
}

export interface RustAnalysisReport {
  deprecated_libs: DeprecatedLibs[];
  report_parse: ReportParse;

  is_env_present: boolean;
}

export interface DeprecatedLibs {
  name: string;
  current: string;
  latest: string;
  status: string;
  deprecated: boolean;
}

export interface ReportParse {
  dead_code: DeadCodeItem[];
  env_vars: SecretItem[];
}

export interface DeadCodeItem {
  name: string;
  kind: DeadCodeKind;
  file: string;
  line: number;
  column: number;
}

export interface SecretItem {
  file: string;
  kind: string;
  name: string;
  value_preview: string;
  line: number;
  column: number;
}

export enum DeadCodeKind {
  Function = "function",
  Variable = "variable",
}

export type IssuesAnalysis = {
  issuesRatio: number; // 0..1
  isManyIssuesUnresolved: boolean; // rule-of-thumb threshold
  message: string;
};

export type DepStatus = "ok" | "warning" | "error";
export function asDepStatus(s: string): DepStatus {
  return s === "ok" || s === "warning" || s === "error" ? s : "warning";
}
