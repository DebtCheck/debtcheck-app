import { Report } from "@/types/report";

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
  values : JiraProjects[]
}

export interface JiraButtonsProps {
  projectId: string;
  report: Report | null;
}

export type JiraProfile = 
{ cloudId: string; 
  name?: string; 
  image?: string 
};

export type JiraAccessibleResource = {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl?: string;
};