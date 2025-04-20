export interface Report {
  updatedAtReport: AnalyzeStaleness;
  pushedAtReport: AnalyzeStaleness;
  issuesReport: AnalyzeIssues;
  prsReport: AnalyzePrs;
}

export interface AnalyzeStaleness {
  label: string;  
  stale: boolean;
  daysSinceUpdate: number;
  message: string;
}

export interface AnalyzeIssues {
  IssuesRatio: number;
  isManyIssuesUnresolved: boolean;
  message: string;
}

export interface AnalyzePrs {
  stalePRsCount: number;
  message: string;
}