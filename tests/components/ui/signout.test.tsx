import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignOutButton from "@/app/components/ui/utilities/buttons/signout";

// --- Hoisted mocks
const signOutMock = vi.hoisted(() => vi.fn());
const routerMock = vi.hoisted(() => ({ refresh: vi.fn() }));

// Mock next-auth and next/navigation
vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routerMock.refresh.mockClear();
});

describe("<SignOutButton />", () => {
  it("renders with default label", () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(<SignOutButton label='Log off' />);
    expect(screen.getByRole("button", { name: /log off/i })).toBeInTheDocument();
  });

  it("calls signOut and router.refresh on click", async () => {
    signOutMock.mockResolvedValueOnce(undefined);

    render(<SignOutButton />);
    const btn = screen.getByRole("button", { name: /sign out/i });

    await fireEvent.click(btn);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
      expect(routerMock.refresh).toHaveBeenCalledTimes(1);
    });
  });
});