import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  priorityFromDepStatus,
  baseLabels,
  describeStaleness,
  describeIssues,
  describePRs,
  describeDeadCode,
  describeDeps,
  describeSecrets,
  fetchCreateMeta,
  pickPriorityValue,
  createJiraIssue,
} from "@/app/lib/jira/tickets"; // <- adjust path to your file

import type { CreateMetaField, AdfDoc } from "@/app/types/jira";
import type { Report, DeprecatedLibs, DeadCodeItem } from "@/app/types/report";

const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });

describe("jira create helpers", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // ---------- tiny pure helpers ----------
  it("priorityFromDepStatus maps correctly", () => {
    expect(priorityFromDepStatus("error")).toBe("High");
    expect(priorityFromDepStatus("warning")).toBe("Medium");
    expect(priorityFromDepStatus("ok")).toBe("Low");
  });

  it("baseLabels builds label trio", () => {
    expect(baseLabels("dependencies")).toEqual([
      "debtcheck",
      "technical-debt",
      "category:dependencies",
    ]);
  });

  // ---------- ADF builders ----------
  const makeReport = (over: Partial<Report> = {}): Report => ({
    updatedAtReport: {
      label: "u",
      stale: true,
      daysSinceUpdate: 10,
      message: "Updated is stale",
    },
    pushedAtReport: {
      label: "p",
      stale: false,
      daysSinceUpdate: 1,
      message: "Pushed ok",
    },
    issuesReport: {
      issuesRatio: 0.25,
      isManyIssuesUnresolved: true,
      message: "Many open issues",
    },
    prsReport: { stalePRsCount: 3, message: "3 stale PRs" },
    rustAnalysisReport: {
      deprecated_libs: [],
      report_parse: { dead_code: [], env_vars: [] },
      is_env_present: false,
    },
    ...over,
  });

  it("describeStaleness includes stale messages", () => {
    const doc = describeStaleness(makeReport());
    expect(doc.type).toBe("doc");
    expect((doc as AdfDoc).content?.[1]).toBeDefined(); // bulletList present
  });

  it("describeIssues formats ratio and message", () => {
    const doc = describeIssues(makeReport());
    const para = JSON.stringify(doc);
    expect(para).toContain("Unresolved issues");
    expect(para).toContain("25%");
    expect(para).toContain("Many open issues");
  });

  it("describePRs lists stale PR count", () => {
    const doc = describePRs(makeReport());
    expect(JSON.stringify(doc)).toContain("Stale PRs (>30d): 3");
  });

  it("describeDeadCode caps list and shows extra marker", () => {
    const items = Array.from({ length: 32 }, (_, i) => ({
      name: `f${i}`,
      kind: (i % 2
        ? "variable"
        : "function") as unknown as DeadCodeItem["kind"],
      file: `src/a${i}.ts`,
      line: i + 1,
      column: 1,
    })) as DeadCodeItem[];
    const doc = describeDeadCode(items);
    const s = JSON.stringify(doc);
    expect(s).toContain("(+2 more…)"); // 32 -> 30 + 2
  });

  it("describeDeps prints downgraded libs and JSON section", () => {
    const libs = [
      {
        name: "react",
        current: "18.0.0",
        latest: "19.0.0",
        status: "warning",
        deprecated: false,
      },
      {
        name: "foo",
        current: "1.0.0",
        latest: "3.0.0",
        status: "error",
        deprecated: true,
      },
    ] as DeprecatedLibs[];

    const doc = describeDeps(libs);

    // sanity checks on headings/bullets
    const s = JSON.stringify(doc);
    expect(s).toContain("Outdated / deprecated dependencies");
    expect(s).toContain("react: 18.0.0 → 19.0.0 [warning]");

    // extract codeBlock JSON payload
    const codeNode = doc.content?.find((n) => n.type === "codeBlock");
    expect(codeNode).toBeTruthy();

    const textNode = (codeNode as any).content?.[0];
    expect(textNode?.type).toBe("text");

    const payload = JSON.parse(textNode.text as string);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0].name).toBe("react");
  });

  it("describeSecrets renders env + example", () => {
    const doc = describeSecrets("Bearer…", 5, true);
    const s = JSON.stringify(doc);
    expect(s).toContain(".env-like file(s) present in repository.");
    expect(s).toContain("5 secret-like");
    expect(s).toContain("Bearer…");
  });

  // ---------- fetchCreateMeta / pickPriorityValue ----------
  it("fetchCreateMeta returns first issuetype and fields", async () => {
    const payload = {
      projects: [
        {
          issuetypes: [
            {
              id: "10001",
              name: "Task",
              fields: {
                priority: {
                  allowedValues: [
                    { id: "3", name: "Medium" },
                    { id: "1", name: "Highest" },
                  ],
                } as CreateMetaField,
              } as Record<string, CreateMetaField>,
            },
          ],
        },
      ],
    };
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(ok(payload));
    const meta = await fetchCreateMeta("cloud-1", "tok", "10000", "Task");
    expect(spy).toHaveBeenCalled();
    expect(meta.issueTypeId).toBe("10001");
    expect(Object.keys(meta.fields)).toContain("priority");
  });

  it("fetchCreateMeta throws on non-OK / missing issuetype", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500 })
    );
    await expect(fetchCreateMeta("c", "t", "p")).rejects.toThrow(
      "createmeta 500"
    );

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      ok({ projects: [{ issuetypes: [] }] })
    );
    await expect(fetchCreateMeta("c", "t", "p")).rejects.toThrow(
      "No issue type meta"
    );
  });

  it("pickPriorityValue chooses desired or falls back", () => {
    const fields: Record<string, CreateMetaField> = {
      priority: {
        allowedValues: [
          { id: "1", name: "Highest" },
          { id: "3", name: "Medium" },
        ],
      } as CreateMetaField,
    };
    expect(pickPriorityValue(fields, "Highest")).toEqual({
      id: "1",
      name: "Highest",
    });
    expect(pickPriorityValue(fields, "Low")).toEqual({
      id: "1",
      name: "Highest",
    }); // fallback to first
    expect(pickPriorityValue({}, "High")).toBeNull();
  });

  // ---------- createJiraIssue ----------
  it("createJiraIssue posts fields and returns ok result", async () => {
    const body = { id: "123", key: "KAN-1" };
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(ok(body));

    const doc: AdfDoc = { version: 1, type: "doc", content: [] };
    const res = await createJiraIssue(
      "cloud-1",
      "tok",
      "10000",
      "10001",
      "Title",
      doc,
      ["debtcheck"],
      "Medium",
      {
        priority: {
          allowedValues: [{ id: "3", name: "Medium" }],
        } as CreateMetaField,
      }
    );

    expect(spy).toHaveBeenCalledWith(
      "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/issue",
      expect.objectContaining({ method: "POST" })
    );
    expect(res.ok).toBe(true);
    expect(res).toMatchObject({ id: "123", key: "KAN-1" });
  });

  it("createJiraIssue returns rich error when Jira rejects", async () => {
    const err = { errorMessages: ["Field 'summary' is required"] };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(err), { status: 400 })
    );

    const out = await createJiraIssue(
      "c",
      "t",
      "p",
      "it",
      "",
      { version: 1, type: "doc", content: [] },
      [],
      undefined,
      undefined
    );

    expect(out.ok).toBe(false);
    expect(out.status).toBe(400);
    expect(out.error).toContain("summary");
  });
});
