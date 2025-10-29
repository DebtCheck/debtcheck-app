"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "./components/ui/utilities/base/card";
import { Button } from "./components/ui/utilities/buttons/button";
import GitHubAuth from "./components/ui/header/githubAuth";
import type { Report } from "@/app/types/report";
import { ReposPage } from "./components/repos/reposPage";
import { fetchJsonOrThrow } from "@/app/lib/http/rust-error";
import { ApiError } from "@/app/lib/http/response";
import {
  AnalyzeHero,
  InlineAlert,
  ProgressBar,
} from "./components/ui/utilities";
import { ThemeToggle } from "./components/ui/header/theme-toggle";
import { useTheme } from "next-themes";
import { mapApiErrorToUi, UiError } from "./lib/http/ui-error";
import { ReportPage } from "./components/report/reportPage";
import { ChevronLeft } from "lucide-react";
import { LocaleDropdown } from "./components/ui/header/lang/localeDropdown";
import { useTranslations } from "next-intl";
import { Section as BaseSection } from "./components/ui/utilities/base/section";
import { Collapsible } from "./components/ui/utilities/data-display/collapsible";
import { LabelWithTip } from "./components/ui/utilities/base/tip/labelWithTip";

export default function Home() {
  const t = useTranslations("Home");
  const { data: session } = useSession();
  const githubLinked = !!session?.providers?.github;

  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [withoutLog, setWithoutLog] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [uiError, setUiError] = useState<UiError | null>(null);
  const { resolvedTheme } = useTheme(); // "light" | "dark"
  const controllerRef = useRef<AbortController | null>(null);
  const [showRepos, setShowRepos] = useState(false);

  useEffect(() => {
    if (githubLinked && withoutLog) setWithoutLog(false);
  }, [githubLinked, withoutLog]);

  useEffect(() => {
    const stored = withoutLog
      ? sessionStorage.getItem("report")
      : localStorage.getItem("report");
    if (stored) {
      try {
        const parsed: Report = JSON.parse(stored);
        setResult(parsed);
      } catch {
        // ignore parse errors
      }
    }
  }, [withoutLog]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const isValidRepoUrl = useMemo(() => {
    try {
      const u = new URL(repoUrl);
      return u.hostname === "github.com" && /^\/[^/]+\/[^/]+/.test(u.pathname);
    } catch {
      return false;
    }
  }, [repoUrl]);

  const handleAnalyze = useCallback(async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setUiError(null);
    setResult(null);

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const data = await fetchJsonOrThrow<{ ok: true; data: Report }>(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoUrl,
            demo: !githubLinked || withoutLog,
          }),
          signal: controller.signal,
        }
      );

      if (withoutLog) {
        sessionStorage.setItem("report", JSON.stringify(data.data));
      } else {
        localStorage.setItem("report", JSON.stringify(data.data));
      }

      setResult(data.data);
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = mapApiErrorToUi(err, {
          githubLinked,
          startCooldown: (secs) => setCooldown(secs),
        });
        setUiError(mapped);
      } else if (err instanceof Error) {
        setUiError({
          variant: "error",
          title: "Network error",
          description: err.message,
        });
      } else {
        setUiError({ variant: "error", title: "Unexpected error" });
      }
    } finally {
      setLoading(false);
    }
  }, [cooldown, repoUrl, githubLinked, withoutLog]);

  const handleWithoutLog = () => {
    setWithoutLog(true);
  };

  if (!githubLinked && !withoutLog) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <GitHubAuth />
        <Button onClick={handleWithoutLog} className="ml-4">
          {withoutLog
            ? t("continueWithoutLoginDots")
            : t("continueWithoutLogin")}
        </Button>
      </main>
    );
  }

  const logoSrc =
    resolvedTheme === "dark"
      ? "/github-mark-white.svg"
      : "/github-mark-dark.svg";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-300 bg-background/80 backdrop-blur border-b border-(--line-06) h-(--appbar-h)">
        <div className="max-w-3xl mx-auto flex justify-between items-center h-full px-4">
          <GitHubAuth />
          <div className="flex items-center gap-2">
            <LocaleDropdown />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {!result && (
        <main className="min-h-screen space-y-8 mt-5 pt-(--appbar-h)">
          {/* HERO CARD */}
          <section className="max-w-3xl mx-auto">
            <Card className="shadow-2xl backdrop-blur border border-border/10 [background:var(--card-80)]">
              <CardContent className="p-6 space-y-5">
                <h1 className="text-2xl md:text-3xl font-semibold text-center flex items-center justify-center gap-2">
                  <Image
                    src={logoSrc}
                    alt={t("analyzeCtaAlt")}
                    width={28}
                    height={28}
                    priority
                  />
                  <span className="text-2xl md:text-3xl font-semibold text-center">
                    {t("analyzeGithubRepo")}
                  </span>
                </h1>

                <div className="flex-1">
                  <AnalyzeHero
                    variant="header"
                    size="sm"
                    value={repoUrl}
                    onChange={setRepoUrl}
                    onAnalyze={() => {
                      if (!loading && isValidRepoUrl) void handleAnalyze();
                    }}
                    loading={loading}
                    disabled={!isValidRepoUrl || cooldown > 0}
                    ctaLabel={
                      cooldown > 0
                        ? t("retryIn", { seconds: Math.ceil(cooldown) })
                        : t("analyze")
                    }
                    loadingLabel={t("analyzing")}
                    className="mb-2"
                  />

                  {/* Inline tips under the input */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <LabelWithTip
                      label={<span>{t("tips.urlFormat")}</span>}
                      tip={<span>{t("tips.urlFormatTips")}</span>}
                    />
                    <span>•</span>
                    <LabelWithTip
                      label={<span>{t("tips.readonly")}</span>}
                      tip={<span>{t("tips.readonlyTips")}</span>}
                    />
                    <span>•</span>
                    <LabelWithTip
                      label={<span>{t("tips.scopes")}</span>}
                      tip={<span>{t("tips.scopesTips")}</span>}
                    />
                  </div>
                </div>

                {(uiError || cooldown > 0) && (
                  <InlineAlert
                    variant={
                      cooldown > 0 ? "warning" : uiError?.variant ?? "error"
                    }
                    title={
                      cooldown > 0
                        ? t("quotaTitle", { seconds: Math.ceil(cooldown) })
                        : uiError!.title
                    }
                    description={
                      cooldown > 0 ? undefined : uiError?.description
                    }
                    className="mt-3"
                  />
                )}

                {withoutLog && (
                  <InlineAlert
                    variant="warning"
                    title={t("anonTitle")}
                    description={t("anonDesc")}
                    className="mt-3"
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* QUICK START (3 étapes) */}
          <section className="max-w-5xl mx-auto">
            <BaseSection
              title={t("quickStartTitle")}
              subtitle={t("quickStartSubtitle")}
              padded
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickStep
                  n={1}
                  title={t("quickStep1Title")}
                  tip={t("quickStep1Tip")}
                />
                <QuickStep
                  n={2}
                  title={t("quickStep2Title")}
                  tip={t("quickStep2Tip")}
                />
                <QuickStep
                  n={3}
                  title={t("quickStep3Title")}
                  tip={t("quickStep3Tip")}
                />
              </div>

              <div className="mt-4">
                <Collapsible title={t("examplesTitle")} defaultOpen={false}>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>https://github.com/vercel/next.js</li>
                    <li>https://github.com/rust-lang/rust</li>
                    <li>
                      https://github.com/owner/private-repo {t("githubRequired")}
                    </li>
                  </ul>
                </Collapsible>
              </div>
            </BaseSection>
          </section>

          {/* USER REPOS */}
          {!withoutLog && (
            <section className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">{t("myReposTitle")}</h2>
                <Button onClick={() => setShowRepos((s) => !s)}>
                  {showRepos ? t("hide") : t("browseRepos")}
                </Button>
              </div>

              {showRepos && (
                <ReposPage onSelectRepo={(url) => setRepoUrl(url)} />
              )}
            </section>
          )}
        </main>
      )}

      {result && (
        <main className="pt-(--appbar-h)">
          <Button
            className="mt-4 ml-4"
            onClick={() => {
              setResult(null);
              sessionStorage.removeItem("report");
              localStorage.removeItem("report");
            }}
          >
            <ChevronLeft />
          </Button>
          <ReportPage report={result} />
        </main>
      )}
    </>
  );
}

function QuickStep({
  n,
  title,
  tip,
}: {
  n: number;
  title: string;
  tip: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full border border-(--line-neutral-20) flex items-center justify-center text-sm font-semibold">
            {n}
          </div>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{tip}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
