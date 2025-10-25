export type UiErrorVariant = "error" | "warning" | "info" | "success";

export type UiError = {
  variant: UiErrorVariant;
  title: string;
  description?: string;
  // optional CTA
  actionLabel?: string;
  action?: () => void;
  // optional link
  linkLabel?: string;
  linkHref?: string;
};

import { ApiError } from "@/app/lib/http/response";

export function mapApiErrorToUi(
  e: ApiError,
  opts: { githubLinked: boolean; startCooldown: (secs: number) => void }
): UiError {
  const ra = (e.meta as { retry_after_secs?: number })?.retry_after_secs;

  // Special-case unauthenticated GitHub rate limit (you already emit 429 with hint)
  if (e.status === 429 && e.code === "rate_limited") {
    if (Number.isFinite(ra)) opts.startCooldown(ra!);
    return {
      variant: "warning",
      title: "GitHub rate limited (unauthenticated).",
      description:
        e.hint ??
        "You're hitting the anonymous GitHub quota. Sign in for a higher limit or wait and try again.",
      actionLabel: opts.githubLinked ? undefined : "Sign in with GitHub",
      action: opts.githubLinked ? undefined : () => {
        // programmatically click your auth button if you expose a method
        // or navigate to /api/auth/signin
        window.location.href = "/api/auth/signin?provider=github";
      },
    };
  }

  // Classic auth states
  if (e.status === 401 || e.code === "unauthorized") {
    return {
      variant: "warning",
      title: "Sign in required",
      description: e.hint ?? "Please connect your GitHub account to continue.",
      actionLabel: "Sign in with GitHub",
      action: () => (window.location.href = "/api/auth/signin?provider=github"),
    };
  }

  if (e.status === 403 && e.code === "forbidden") {
    // Could be SSO/OAuth org restriction — your Next route sometimes sets `details.docsUrl`
    const docs =
      (e.details as { docsUrl?: string })?.docsUrl ||
      "https://docs.github.com/en/organizations/managing-saml-single-sign-on-for-your-organization";
    return {
      variant: "warning",
      title: "Access blocked by organization",
      description:
        e.hint ??
        "This repository is protected (SAML/OAuth restrictions). Ask your org admin or authorize the app.",
      linkLabel: "How to enable access",
      linkHref: docs,
    };
  }

  // Repository too big / payload too large
  if (e.status === 413) {
    return {
      variant: "warning",
      title: "Repository too large",
      description:
        "This repository is too large to analyze safely. Try a smaller repo or narrow the scope (monorepo package).",
    };
  }

  // Validation / bad input
  if (e.status === 400 || e.status === 422 || e.code === "validation_failed") {
    return {
      variant: "error",
      title: "Invalid input",
      description: e.message || "Please check the repository URL and try again.",
    };
  }

  // Upstream temps
  if (e.status === 502 || e.status === 504 || e.code === "upstream_error") {
    return {
      variant: "error",
      title: "Temporary backend error",
      description: "Our analyzer had a hiccup. Please retry in a moment.",
    };
  }

  // Default
  return {
    variant: "error",
    title: "Something went wrong",
    description: e.message || "Unexpected error.",
  };
}