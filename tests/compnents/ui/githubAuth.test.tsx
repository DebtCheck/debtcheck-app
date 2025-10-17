import type { Session } from "next-auth";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitHubAuth from "@/app/components/ui/githubAuth";

// Hoisted spies
const signInMock = vi.hoisted(() => vi.fn());
const useSessionMock = vi.hoisted(() =>
  vi.fn<
    () => {
      data: (Session & { providers?: { github?: boolean } }) | null;
      update: () => Promise<Session | null>;
    }
  >()
);
// ⬇️ Make a stable router object with a refresh spy
const routerMock = vi.hoisted(() => ({ refresh: vi.fn() }));

// Mock next/image to a simple <img>
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: useSessionMock,
  signIn: signInMock,
}));

// Mock next/navigation: return the SAME routerMock object
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

function makeSession(
  partial?: Partial<Session>,
  githubLinked = false
): Session & { providers: { github: boolean } } {
  return {
    user: { name: "John", email: "john@example.com", image: null, id: "u1" },
    expires: "2999-01-01T00:00:00.000Z",
    providers: { github: githubLinked, jira: false },
    ...partial,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  routerMock.refresh.mockClear(); // ⬅️ reset call count between tests
});

describe("<GitHubAuth />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login button when GitHub is not linked and calls signIn on click", async () => {
    // session without github linked
    useSessionMock.mockReturnValue({
      data: makeSession(undefined, false),
      update: vi.fn(async () => null),
    });

    render(<GitHubAuth />);

    // finds the button by its title (accessible name from title attribute is fine, too)
    const btn = screen.getByTitle(/login with github/i);
    expect(btn).toBeInTheDocument();

    await fireEvent.click(btn);

    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith("github", { callbackUrl: "/" });
  });

  it("renders welcome + Disconnect when GitHub is linked", () => {
    useSessionMock.mockReturnValue({
      data: makeSession(undefined, true),
      update: vi.fn(async () => null),
    });

    render(<GitHubAuth />);

    expect(screen.getByText(/welcome, john/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /disconnect github/i })
    ).toBeInTheDocument();
  });

  it("on Disconnect: DELETEs /api/github then calls update() and router.refresh(), showing busy label", async () => {
    const updateSpy = vi.fn(async () => null);
    useSessionMock.mockReturnValue({
      data: makeSession(undefined, true),
      update: updateSpy,
    });

    const refreshSpy = routerMock.refresh; // instance created by our factory
    // Successful DELETE
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<GitHubAuth />);

    const disconnectBtn = screen.getByRole("button", {
      name: /disconnect github/i,
    });
    await fireEvent.click(disconnectBtn);

    // Busy state appears immediately
    expect(disconnectBtn).toHaveTextContent(/disconnecting/i);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/github", {
        method: "DELETE",
      });
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      // Back to normal label
      expect(disconnectBtn).toHaveTextContent(/disconnect github/i);
    });
  });

  it("still calls update() and router.refresh() even if DELETE returns non-OK", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    const updateSpy = vi.fn(async () => null);
    useSessionMock.mockReturnValue({
      data: makeSession(undefined, true),
      update: updateSpy,
    });

    const refreshSpy = routerMock.refresh;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "oops" }), {
        status: 500,
        statusText: "Server Error",
      })
    );

    render(<GitHubAuth />);

    const disconnectBtn = screen.getByRole("button", {
      name: /disconnect github/i,
    });
    await fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(disconnectBtn).toHaveTextContent(/disconnect github/i);
    });

    consoleErr.mockRestore();
  });
});
