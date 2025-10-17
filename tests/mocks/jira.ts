import { vi } from "vitest";
export const ensureFreshJiraAccessToken = vi.fn().mockResolvedValue({ accessToken: "tok", account: {} });
export const fetchAccessibleRessources   = vi.fn().mockResolvedValue({ id: "site-1" });
export const fetchProjects               = vi.fn().mockResolvedValue({ values: [{ id: "100", key: "K", name: "Proj" }] });

vi.mock("@/lib/jira", () => ({
  ensureFreshJiraAccessToken,
  fetchAccessibleRessources,
  fetchProjects,
}));