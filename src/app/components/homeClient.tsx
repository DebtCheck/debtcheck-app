"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Report } from "@/app/types/report";
import { fetchJsonOrThrow } from "@/app/lib/http/rust-error";
import { ApiError } from "@/app/lib/http/response";
import { useTheme } from "next-themes";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mapApiErrorToUi, UiError } from "../lib/http/ui-error";
import {
  loadReportFromStorage,
  saveReportToStorage,
} from "../lib/report-storage";
import { ReportPage } from "./report/reportPage";
import { ReposPage } from "./repos/reposPage";
import GitHubAuth from "./ui/header/githubAuth";
import { LastReportButton } from "./ui/lastReportButton";
import {
  Button,
  Card,
  CardContent,
  AnalyzeHero,
  InlineAlert,
} from "./ui/utilities";
import { LabelWithTip } from "./ui/utilities/base/tip/labelWithTip";
import { Collapsible } from "./ui/utilities/data-display/collapsible";
import { Section as BaseSection } from "./ui/utilities/base/section";

export default function Home() {
  const t = useTranslations("Home");
  const { data: session } = useSession();
  const githubLinked = !!session?.providers?.github;

  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [uiError, setUiError] = useState<UiError | null>(null);
  const { resolvedTheme } = useTheme();
  const controllerRef = useRef<AbortController | null>(null);
  const [showRepos, setShowRepos] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const id = search.get("r");
    if (!id) setResult(null);
  }, [search]);

  useEffect(() => {
    const id = search.get("r");
    if (!id) return;
    const loaded = loadReportFromStorage(id);
    if (loaded) {
      setResult(loaded);
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router, search]);

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
            demo: !githubLinked, // demo si pas connecté
          }),
          signal: controller.signal,
        }
      );

      const id = crypto.randomUUID();
      saveReportToStorage(id, data.data, { ephemeral: !githubLinked }); // éphemeral si pas connecté
      setResult(data.data);
      router.replace(`${pathname}?r=${encodeURIComponent(id)}`, {
        scroll: false,
      });
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
  }, [cooldown, repoUrl, githubLinked, router, pathname]);

  const logoSrc =
    resolvedTheme === "dark"
      ? "/github-mark-white.svg"
      : "/github-mark-dark.svg";

  return (
    <>
      {!result && (
        <main className="space-y-8">
          {/* HERO */}
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

                  <div className="flex items-center justify-center">
                    <LastReportButton />
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
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

                {!githubLinked && (
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

          {/* QUICK START */}
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
                      https://github.com/owner/private-repo{" "}
                      {t("githubRequired")}
                    </li>
                  </ul>
                </Collapsible>
              </div>
            </BaseSection>
          </section>

          {/* USER REPOS */}
          {githubLinked && (
            <section className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
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
        <main>
          <Button
            className="mt-4 ml-4"
            onClick={() => {
              setResult(null);
              router.replace(pathname, { scroll: false });
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
