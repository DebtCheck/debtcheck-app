import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JiraButtons from "@/app/components/ui/jira/jiraButtons";

describe("<JiraButtons />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /api/jira/tickets with correct headers and body", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

    render(<JiraButtons projectId="100" report={null} />);

    const btn = screen.getByRole("button", { name: /create ticket/i });
    await fireEvent.click(btn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/jira/tickets");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ projectId: "100", report: null }));
  });

  it("handles non-OK responses without throwing", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "oops" }), {
          status: 500,
          statusText: "Server Error",
        })
      );

    render(<JiraButtons projectId="200" report={null} />);

    const btn = screen.getByRole("button", { name: /create ticket/i });
    await fireEvent.click(btn);

    // If the handler accidentally throws, the test will fail here.
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("handles network errors (fetch rejects) without throwing", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("network down"));

    render(<JiraButtons projectId="300" report={null} />);

    const btn = screen.getByRole("button", { name: /create ticket/i });
    await fireEvent.click(btn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});