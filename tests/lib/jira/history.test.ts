import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  getProjectKey,
  buildJql,
  searchIssues,
  type HistoryIssue,
} from "@/app/lib/jira/history";

const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });

describe("lib/jira/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------- getProjectKey ----------
  it("getProjectKey fetches project and returns key", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json({ key: "KAN" }));

    const out = await getProjectKey("cloud-1", "tok", "10000");
    expect(out).toBe("KAN");
    expect(spy).toHaveBeenCalledWith(
      "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/project/10000",
      {
        headers: {
          Authorization: "Bearer tok",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
  });

  it("getProjectKey throws on non-OK", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("", { status: 404 })
    );
    await expect(getProjectKey("c", "t", "p")).rejects.toThrow("project 404");
  });

  // ---------- buildJql ----------
  it("buildJql builds base JQL with labels", () => {
    const { primary, fallback } = buildJql({ projectKey: "KAN" });
    const expected = `project = KAN AND labels in (debtcheck) ORDER BY created DESC`;
    expect(primary).toBe(expected);
    expect(fallback).toBe(expected);
  });

  it("buildJql includes optional category and repo", () => {
    const { primary } = buildJql({
      projectKey: "KAN",
      category: "dependencies",
      repo: "owner/name",
    });
    expect(primary).toBe(
      `project = KAN AND labels in (debtcheck) AND labels in ("category:dependencies") AND text ~ "owner/name" ORDER BY created DESC`
    );
  });

  // ---------- searchIssues ----------
  it("searchIssues uses new endpoint and maps issues with URL (no trailing slash leak)", async () => {
    const issuesPayload = {
      issues: [
        { id: "1", key: "KAN-1", fields: { summary: "A", created: "2025-01-01" } },
        { id: "2", key: "KAN-2", fields: { summary: "B", created: "2025-01-02" } },
      ],
    };

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json(issuesPayload)); // new /search/jql OK

    const out = await searchIssues(
      "cloud-1",
      "tok",
      'project = KAN ORDER BY created DESC',
      10,
      "https://my.atlassian.net/" // trailing slash
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/search/jql"
    );

    // url composed properly
    expect(out.map((i: HistoryIssue) => i.url)).toEqual([
      "https://my.atlassian.net/browse/KAN-1",
      "https://my.atlassian.net/browse/KAN-2",
    ]);
    // data mapped
    expect(out[0].summary).toBe("A");
  });

  it("searchIssues falls back to old endpoint when new returns 404/410", async () => {
    const notFound = new Response("", { status: 404 });
    const payload = {
      issues: [
        { id: "1", key: "KAN-1", fields: { summary: "S", created: "2025-01-01" } },
      ],
    };
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(notFound) // new
      .mockResolvedValueOnce(json(payload)); // old

    const out = await searchIssues("c", "t", "JQL", 5, "https://x.net");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toContain("/search/jql");
    expect(spy.mock.calls[1][0]).toContain("/rest/api/3/search");
    expect(out[0].key).toBe("KAN-1");
  });

  it("searchIssues throws with detailed message when both endpoints fail", async () => {
    const errBody = { errorMessages: ["bad JQL"] };
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(errBody), { status: 400 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(errBody), { status: 400 })
      );

    await expect(searchIssues("c", "t", "JQL", 5)).rejects.toThrow(
      /search 400: bad JQL/i
    );
  });
});