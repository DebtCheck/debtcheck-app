import { Report } from "@/app/types/report";

export type JiraProjects = {
  id: string;
  key: string;
  name: string;
  avatarUrls?: Record<string, string>;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
};

export type Projects = {
  values: JiraProjects[];
};

export interface JiraButtonsProps {
  projectId: string;
  report: Report | null;
}

export type JiraProfile = { cloudId: string; name?: string; image?: string };

export type JiraAccessibleResource = {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl?: string;
};

export type JiraCloudSite = {
  cloudId: string;
  name: string;
  url: string;
  avatarUrl?: string;
  scopes: string[];
};

export type JiraAccount = {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

export type AdfText = { type: "text"; text: string };
export type AdfParagraph = { type: "paragraph"; content: AdfText[] };
export type AdfHeading = {
  type: "heading";
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  content: AdfText[];
};
export type AdfBulletItem = { type: "listItem"; content: AdfParagraph[] };
export type AdfBulletList = { type: "bulletList"; content: AdfBulletItem[] };
export type AdfCodeBlock = {
  type: "codeBlock";
  attrs?: { language?: string };
  content: AdfText[];
};
export type AdfDoc = {
  version: 1;
  type: "doc";
  content: (AdfHeading | AdfParagraph | AdfBulletList | AdfCodeBlock)[];
};

export type PlannedIssue = {
  summary: string;
  description: AdfDoc;
  labels: string[];
  priority?: "Highest" | "High" | "Medium" | "Low";
};

export type CreateIssueResult =
  | { ok: true; id: string; key: string; summary: string }
  | { ok: false; summary: string; error: string; status?: number };

export type CreateMetaFieldOption = { id?: string; name?: string };
export type CreateMetaField = {
  key: string;
  required: boolean;
  allowedValues?: CreateMetaFieldOption[];
  hasDefaultValue?: boolean;
};
export type CreateMeta = {
  issueTypeId: string;
  fields: Record<string, CreateMetaField>;
};