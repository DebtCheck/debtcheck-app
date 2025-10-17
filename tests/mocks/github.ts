import { vi } from "vitest";
export const fetchUserRepos = vi.fn().mockResolvedValue({
  data: [
    { id: 1, full_name: "you/repo", html_url: "https://g", owner: { login: "you", avatar_url: "" }, private: false, language: "TS", pushed_at: "2024-01-01T00:00:00Z" },
  ],
  hasNext: false,
  fromCache: false,
});
vi.mock("@/lib/github/github", () => ({ fetchUserRepos }));