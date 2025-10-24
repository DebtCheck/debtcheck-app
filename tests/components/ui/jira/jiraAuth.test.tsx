import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Session } from "next-auth";
import JiraAuth from "@/app/components/ui/jira/jiraAuth";

// ---------- Hoisted/stable mocks ----------
const useSessionMock = vi.hoisted(() =>
  vi.fn<
    () => {
      data: (Session & { providers?: { jira?: boolean; github?: boolean } }) | null;
      status: "loading" | "authenticated" | "unauthenticated";
      update: () => Promise<Session | null>;
    }
  >()
);

const signInMock = vi.hoisted(() => vi.fn());
const routerMock = vi.hoisted(() => ({ refresh: vi.fn() }));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: useSessionMock,
  signIn: signInMock,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// Mock child component to keep tests focused (it will render a marker text)
vi.mock("@/components/ui/jira/jiraProjects", () => ({
  default: ({ values }: { values: Array<{ id: string; key?: string; name?: string }> }) => (
    <div data-testid="jira-projects">JiraProjects:{values.length}</div>
  ),
}));

// ---------- Helpers ----------
function makeSession(
  status: "loading" | "authenticated" | "unauthenticated",
  linked: boolean
) {
  const session: Session & { providers: { jira: boolean; github?: boolean } } = {
    user: { id: "u1", name: "John", email: "john@example.com", image: null },
    expires: "2999-01-01T00:00:00.000Z",
    providers: { github: false, jira: linked },
  };
  return {
    data: status === "authenticated" ? session : null,
    status,
    update: vi.fn(async () => null),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  routerMock.refresh.mockClear();
});

// ---------- Tests ----------
describe("<JiraAuth />", () => {
  it("shows loading state when session is loading", () => {
    useSessionMock.mockReturnValue(makeSession("loading", false));
    render(<JiraAuth report={null} />);
    expect(screen.getByText(/checking session…/i)).toBeInTheDocument();
  });

  it("shows Connect button when authenticated but Jira not linked, and calls signIn('jira')", async () => {
    useSessionMock.mockReturnValue(makeSession("authenticated", false));
    render(<JiraAuth report={null} />);

    const btn = screen.getByRole("button", { name: /connect to jira/i });
    expect(btn).toBeInTheDocument();

    await fireEvent.click(btn);
    expect(signInMock).toHaveBeenCalledWith("jira", { callbackUrl: "/" });
  });

  it("when linked: fetches projects and renders JiraProjects component", async () => {
    const session = makeSession("authenticated", true);
    useSessionMock.mockReturnValue(session);

    // 1st fetch: GET /api/jira/projects → two projects
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ values: [{ id: "100" }, { id: "200" }] }), { status: 200 })
    );

    render(<JiraAuth report={null} />);

    // Then renders mocked JiraProjects with count
    await waitFor(() => {
      expect(screen.getByTestId("jira-projects")).toHaveTextContent("JiraProjects:2");
    });

    // Disconnect button present
    expect(screen.getByRole("button", { name: /disconnect jira/i })).toBeInTheDocument();
  });

  it("when linked but no projects: shows empty state", async () => {
    useSessionMock.mockReturnValue(makeSession("authenticated", true));

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ values: [] }), { status: 200 })
    );

    render(<JiraAuth report={null} />);

    await waitFor(() => {
      expect(screen.getByText(/you have no jira projects available/i)).toBeInTheDocument();
    });
  });

  it("disconnect flow: DELETEs /api/jira then calls update() and router.refresh(), toggling busy label", async () => {
    const updateSpy = vi.fn(async () => null);
    const linked = makeSession("authenticated", true);
    linked.update = updateSpy;
    useSessionMock.mockReturnValue(linked);

    // First fetch (projects list) – keep it simple
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [] }), { status: 200 })) // GET projects
      .mockResolvedValueOnce(new Response(null, { status: 200 })); // DELETE /api/jira

    render(<JiraAuth report={null} />);

    const disconnectBtn = await screen.findByRole("button", { name: /disconnect jira/i });
    await fireEvent.click(disconnectBtn);

    // Busy label appears
    expect(disconnectBtn).toHaveTextContent(/disconnecting/i);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/jira", { method: "DELETE" });
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(routerMock.refresh).toHaveBeenCalledTimes(1);
      expect(disconnectBtn).toHaveTextContent(/disconnect jira/i);
    });
  });

  it("disconnect non-OK still calls update() and router.refresh(), resets label", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    const updateSpy = vi.fn(async () => null);
    const linked = makeSession("authenticated", true);
    linked.update = updateSpy;
    useSessionMock.mockReturnValue(linked);

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [] }), { status: 200 })) // GET projects
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "oops" }), { status: 500, statusText: "Server Error" })
      ); // DELETE /api/jira

    render(<JiraAuth report={null} />);

    const disconnectBtn = await screen.findByRole("button", { name: /disconnect jira/i });
    await fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/jira", { method: "DELETE" });
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(routerMock.refresh).toHaveBeenCalledTimes(1);
      expect(disconnectBtn).toHaveTextContent(/disconnect jira/i);
    });

    consoleErr.mockRestore();
  });
});