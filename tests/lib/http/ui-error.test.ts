import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapApiErrorToUi } from "@/app/lib/http/ui-error";
import type { ApiError } from "@/app/lib/http/response";

function err(partial: Partial<ApiError>): ApiError {
  return {
    status: 500,
    code: "unknown",
    message: "oops",
    hint: undefined,
    meta: undefined,
    details: undefined,
    ...partial,
  } as ApiError;
}

describe("mapApiErrorToUi", () => {
  let startCooldown: (secs: number) => void;

  beforeEach(() => {
    startCooldown = vi.fn();
  });

  it("maps unauthenticated rate limit (429/rate_limited) and starts cooldown", () => {
    const e = err({
      status: 429,
      code: "rate_limited",
      hint: "Too fast",
      meta: { retry_after_secs: 42 },
    });

    const ui = mapApiErrorToUi(e, { githubLinked: false, startCooldown });
    expect(startCooldown).toHaveBeenCalledWith(42);
    expect(ui.variant).toBe("warning");
    expect(ui.title).toContain("rate limited");
    expect(ui.actionLabel).toBe("Sign in with GitHub");
    expect(typeof ui.action).toBe("function");
  });

  it("rate limit when already linked does not expose sign-in action", () => {
    const e = err({ status: 429, code: "rate_limited" });
    const ui = mapApiErrorToUi(e, { githubLinked: true, startCooldown });
    expect(ui.actionLabel).toBeUndefined();
    expect(ui.action).toBeUndefined();
  });

  it("401 / unauthorized → sign-in CTA", () => {
    const e = err({ status: 401, code: "unauthorized", hint: "login pls" });
    const ui = mapApiErrorToUi(e, { githubLinked: false, startCooldown });
    expect(ui.variant).toBe("warning");
    expect(ui.title).toBe("Sign in required");
    expect(ui.description).toContain("login pls");
    expect(ui.actionLabel).toBe("Sign in with GitHub");
  });

  it("403 / forbidden → org access docs link", () => {
    const e = err({
      status: 403,
      code: "forbidden",
      details: { docsUrl: "https://example.com/saml" },
    });
    const ui = mapApiErrorToUi(e, { githubLinked: true, startCooldown });
    expect(ui.variant).toBe("warning");
    expect(ui.linkLabel).toBe("How to enable access");
    expect(ui.linkHref).toBe("https://example.com/saml");
  });

  it("413 → repo too large warning", () => {
    const ui = mapApiErrorToUi(err({ status: 413 }), {
      githubLinked: true,
      startCooldown,
    });
    expect(ui.variant).toBe("warning");
    expect(ui.title).toBe("Repository too large");
  });

  it("404 / not_found → error with message", () => {
    const ui = mapApiErrorToUi(err({ status: 404, code: "not_found", message: "nope" }), {
      githubLinked: true,
      startCooldown,
    });
    expect(ui.variant).toBe("error");
    expect(ui.title).toBe("Repository not found or inaccessible");
    expect(ui.description).toBe("nope");
  });

  it("400 / 422 / validation_failed → invalid input", () => {
    const ui1 = mapApiErrorToUi(err({ status: 400, message: "bad url" }), {
      githubLinked: true,
      startCooldown,
    });
    expect(ui1.title).toBe("Invalid input");
    expect(ui1.description).toBe("bad url");

    const ui2 = mapApiErrorToUi(err({ status: 422 }), {
      githubLinked: true,
      startCooldown,
    });
    expect(ui2.title).toBe("Invalid input");

    const ui3 = mapApiErrorToUi(err({ code: "validation_failed" }), {
      githubLinked: true,
      startCooldown,
    });
    expect(ui3.title).toBe("Invalid input");
  });

  it("upstream temporary errors (502/504/upstream_error)", () => {
    const ui502 = mapApiErrorToUi(err({ status: 502 }), {
      githubLinked: true,
      startCooldown,
    });
    const ui504 = mapApiErrorToUi(err({ status: 504 }), {
      githubLinked: true,
      startCooldown,
    });
    const uiCode = mapApiErrorToUi(err({ code: "upstream_error" }), {
      githubLinked: true,
      startCooldown,
    });
    for (const u of [ui502, ui504, uiCode]) {
      expect(u.variant).toBe("error");
      expect(u.title).toBe("Temporary backend error");
    }
  });

  it("default branch returns generic error", () => {
    const ui = mapApiErrorToUi(err({ status: 418, message: "teapot" }), {
      githubLinked: true,
      startCooldown,
    });
    expect(ui.variant).toBe("error");
    expect(ui.title).toBe("Something went wrong");
    expect(ui.description).toBe("teapot");
  });
});