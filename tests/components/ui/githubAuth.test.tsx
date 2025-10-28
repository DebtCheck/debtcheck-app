import type { Session } from "next-auth";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitHubAuth from "@/app/components/ui/header/githubAuth";
import { renderWithI18n } from "../../helpers/renderWithI18n";
import enMessages from "@/messages/en.json";

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
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
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

    renderWithI18n(<GitHubAuth />, { locale: "en", messages: enMessages });

    // finds the button by its title (accessible name from title attribute is fine, too)
    const btn = screen.getByRole("button", { name: /continue with github/i });
    expect(btn).toBeInTheDocument();

    await fireEvent.click(btn);

    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith("github", {
      callbackUrl: "/",
      redirect: false,
    });
  });

  it("renders welcome + Disconnect when GitHub is linked", () => {
    useSessionMock.mockReturnValue({
      data: makeSession(undefined, true),
      update: vi.fn(async () => null),
    });

    renderWithI18n(<GitHubAuth />, { locale: "en", messages: enMessages });

    expect(screen.getByText(/John/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /disconnect github/i })
    ).toBeInTheDocument();
  });
});
