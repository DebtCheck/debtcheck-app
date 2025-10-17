import { vi } from "vitest";

// default: authenticated user with both providers
export function mockSession(over?: Partial<unknown>) {
  return { user: { id: "u1" }, providers: { github: true, jira: true }, ...over };
}

vi.mock("@/lib/auth/auth", () => ({
  getServerSession: vi.fn().mockResolvedValue(mockSession()),
}));