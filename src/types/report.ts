export interface Report {
  updatedAtReport: AnalyzeStaleness;
  pushedAtReport: AnalyzeStaleness;
}

export interface AnalyzeStaleness {
  label: string;  
  stale: boolean;
  daysSinceUpdate: number;
  message: string;
}