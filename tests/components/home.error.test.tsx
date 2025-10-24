import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";

// --- Mocks (must be before importing Home) ---
vi.mock("@/components/dashboard/repos/page", () => {
  const Mock = (props: { onSelectRepo: (url: string) => void }) => (
    <button onClick={() => props.onSelectRepo("https://github.com/acme/repo")}>
      Mock ReposPage
    </button>
  );
  return {
    __esModule: true,
    default: Mock,    // for default import
    ReposPage: Mock,  // for named import (just in case)
  };
});

vi.mock("@/components/ui/githubAuth", () => ({
  __esModule: true,
  default: () => <div>Mock GitHubAuth</div>,
}));

vi.mock("@/components/ui/jira/jiraAuth", () => ({
  __esModule: true,
  default: () => <div>Mock JiraAuth</div>,
}));

vi.mock("next-auth/react", () => ({
  __esModule: true,
  useSession: () => ({
    data: { providers: { github: true }, user: { name: "Test User" } },
    status: "authenticated",
  }),
}));

// import after mocks
import Home from "@/app/page";

// helpers
const typeUrlAndClickAnalyze = async () => {
  await userEvent.type(
    screen.getByPlaceholderText("https://github.com/user/your-repo"),
    "https://github.com/DebtCheck/debtcheck-app"
  );
  await userEvent.click(screen.getByRole("button", { name: /analyz/i }));
};

const ok = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  }) as unknown as Response;

function mockFetchAnalyze(
  { errorBody, successBody, status = 200 }: {
    errorBody?: object;
    successBody?: object;
    status?: number;
  }
) {
  return vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.endsWith("/api/analyze")) {
      if (status >= 400) {
        return Promise.resolve(ok(errorBody ?? { error: "Boom" }, { status }));
      }
      return Promise.resolve(ok(successBody ?? { ok: true, data: {} }));
    }
    // Any other fetch — return a benign fresh Response
    return Promise.resolve(ok({}));
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Home page UI error display", () => {
  it("renders structured backend error (message + hint + code)", async () => {
    mockFetchAnalyze({
      status: 429,
      errorBody: {
        error: "Trop de requêtes GitHub.",
        code: "rate_limited",
        hint: "Réessaie plus tard ou connecte-toi.",
        meta: { retry_after_secs: 60 },
      },
    });

    render(<Home />);
    await typeUrlAndClickAnalyze();

    // assert the error UI
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Trop de requêtes GitHub\./i);
    expect(alert).toHaveTextContent(/Réessaie plus tard ou connecte-toi\./i);
    expect(alert).toHaveTextContent(/\(rate_limited\)$/i);
  });

  it("renders network abort error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("The operation was aborted."));

    render(<Home />);
    await typeUrlAndClickAnalyze();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent || "").toMatch(/Network error calling backend/i);
    expect(alert.textContent || "").toMatch(/aborted|unknown/i);
  });

  it("renders success JSON block and no error", async () => {
    mockFetchAnalyze({
      status: 200,
      successBody: { ok: true, data: { deprecated_libs: [], dead_code: [] } },
    });

    render(<Home />);
    await typeUrlAndClickAnalyze();

    await waitFor(() => expect(screen.getByText(/"dead_code": \[\]/)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
