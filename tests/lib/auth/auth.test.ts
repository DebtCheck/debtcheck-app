import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AdapterUser } from "next-auth/adapters";
import type { Account } from "@prisma/client";
import { authOptions } from "@/app/lib/auth/auth";

// Mocked Prisma client
const prismaMock = vi.hoisted(() => ({
  account: {
    findMany: vi.fn<() => Promise<Account[]>>(),
  },
}));

// Must mock before importing SUT
vi.mock("@/app/lib/prisma", () => ({ prisma: prismaMock }));

describe("authOptions.callbacks.session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds user.id and provider flags to session", async () => {
    prismaMock.account.findMany.mockResolvedValueOnce([
      { provider: "github" } as Account,
      { provider: "atlassian" } as Account,
    ]);

    const baseSession: Session = {
      user: { id: "", name: "John", email: "john@example.com", image: null },
      expires: "",
    };

    const user: AdapterUser = { id: "u1", name: "John", email: "john@example.com", emailVerified: null, image: null };

    const result = await authOptions.callbacks!.session!({
      session: structuredClone(baseSession),
      user,
      trigger: "update",
      token: {} as unknown as JWT,
      newSession: undefined
    });

    expect((result.user as { id: string }).id).toBe("u1");
    expect((result as Session & { providers: { github: boolean; jira: boolean } }).providers).toEqual({
      github: true,
      jira: true,
    });
  });

  it("sets provider flags to false when no accounts linked", async () => {
    prismaMock.account.findMany.mockResolvedValueOnce([]);

    const baseSession: Session = {
      user: { id: "", name: "Alice", email: "alice@example.com", image: null },
      expires: "",
    };
    const user: AdapterUser = { id: "u2", name: "Alice", email: "alice@example.com", emailVerified: null, image: null };

    const result = await authOptions.callbacks!.session!({
      session: structuredClone(baseSession),
      user,
      token: {} as unknown as JWT,
      newSession: undefined,
      trigger: "update"
    });

    type ExtendedSession = Session & { providers: { github: boolean; jira: boolean } };
    const extended = result as ExtendedSession;
    expect(extended.providers).toEqual({ github: false, jira: false });
  });
});