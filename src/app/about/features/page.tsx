"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Section as BaseSection } from "@/app/components/ui/utilities/base/section";
import { Card, CardContent } from "@/app/components/ui/utilities/base/card";
import { Button } from "@/app/components/ui/utilities/buttons/button";
import { LabelWithTip } from "@/app/components/ui/utilities/base/tip/labelWithTip";
import { Header } from "@/app/components/header";
import { FeatureSection, RulesList, CodeSample } from "./featuresHelper";

export default function FeaturesPage() {
  const t = useTranslations("Features");

  return (
    <>
      <Header />
      <main
        className="mx-auto w-full max-w-6xl min-h-screen space-y-8
                 mt-3 sm:mt-5
                 pt-[calc(var(--appbar-h)+env(safe-area-inset-top))]
                 pb-10 px-3 sm:px-4"
      >
        {/* Header */}
        <BaseSection
          title={t("headerTitle")}
          subtitle={t("headerSubtitle")}
          actions={
            <div
              className="flex flex-col-reverse sm:flex-row
        items-end sm:items-center
        justify-end sm:justify-normal
        gap-2"
            >
              <Link href="/about">
                <Button>{t("cta.about")}</Button>
              </Link>
              <Link href="/">
                <Button>{t("cta.analyze")}</Button>
              </Link>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground mt-2">
            {t("introTagline")}
          </p>
        </BaseSection>

        {/* Table of contents TO KEEP FOR WHEN I'LL HAVE MORE FEATURES */}
        {/* <Card className="mt-6">
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <TocItem href="#deps" label={t("toc.deps")} />
            <TocItem href="#dead" label={t("toc.dead")} />
            <TocItem href="#secrets" label={t("toc.secrets")} />
            <TocItem href="#env" label={t("toc.env")} />
            <TocItem href="#activity" label={t("toc.activity")} />
            <TocItem href="#readonly" label={t("toc.readonly")} />
          </CardContent>
        </Card> */}

        {/* Outdated dependencies */}
        <FeatureSection id="deps" title={t("deps.title")}>
          <p className="text-sm text-muted-foreground mb-4">
            {t("deps.intro")}
          </p>

          <RulesList
            items={[
              { rule: t("deps.rules.ok"), status: "OK" as const },
              {
                rule: t("deps.rules.warnSameMajor"),
                status: "Warning" as const,
              },
              { rule: t("deps.rules.warnPlusOne"), status: "Warning" as const },
              { rule: t("deps.rules.errorTooOld"), status: "Error" as const },
            ]}
          />

          <CodeSample
            label={t("deps.codeLabel")}
            code={`{
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.1"
  }
}`}
          />

          <div className="mt-4">
            <LabelWithTip
              label={
                <span className="text-sm font-medium">
                  {t("deps.howLatest")}
                </span>
              }
              tip={
                <span className="max-w-xs block text-sm">
                  {t("deps.intro")}
                </span>
              }
            />
          </div>
        </FeatureSection>

        {/* Dead code */}
        <FeatureSection id="dead" title={t("dead.title")}>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-3">
            <li>{t("dead.points.fnsVars")}</li>
            <li>{t("dead.points.importsExports")}</li>
            <li>{t("dead.points.crossFile")}</li>
            <li>{t("dead.points.ignores")}</li>
          </ul>

          <CodeSample
            label={t("dead.codeLabel")}
            code={`// before
export const unused = 1; // flagged
export const used = 2;
console.log(used); // ok

// after (suggestion)
// export const unused = 1; // remove
export const used = 2;`}
          />
        </FeatureSection>

        {/* Secrets & keys */}
        <FeatureSection id="secrets" title={t("secrets.title")}>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-3">
            <li>{t("secrets.points.names")}</li>
            <li>{t("secrets.points.patterns")}</li>
            <li>{t("secrets.points.noise")}</li>
          </ul>

          <CodeSample
            label={t("secrets.codeLabel")}
            code={`// flagged
const API_KEY = "AIzaSyD3Y4Z5ExampleExampleExampleExample";

// ok (placeholder)
const API_KEY = "AIzaSyD3Y4Z5xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`}
          />

          <div className="mt-4">
            <LabelWithTip
              label={
                <span className="text-sm font-medium">
                  {t("secrets.noMutationTip")}
                </span>
              }
              tip={
                <span className="max-w-xs block text-sm">
                  {t("secrets.noMutationAnswer")}
                </span>
              }
            />
          </div>
        </FeatureSection>

        {/* .env presence */}
        <FeatureSection id="env" title={t("env.title")}>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>{t("env.points.detects")}</li>
            <li>{t("env.points.advice")}</li>
          </ul>
        </FeatureSection>

        {/* Activity */}
        <FeatureSection id="activity" title={t("activity.title")}>
          <p className="text-sm text-muted-foreground">{t("activity.intro")}</p>
        </FeatureSection>

        {/* Read-only */}
        <FeatureSection id="readonly" title={t("readonly.title")}>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>{t("readonly.points.rust")}</li>
            <li>{t("readonly.points.concurrent")}</li>
            <li>{t("readonly.points.results")}</li>
          </ul>
        </FeatureSection>

        <FeatureSection id="jira" title={t("jira.title")}>
          <p className="text-sm text-muted-foreground mb-3">
            {t("jira.intro")}
          </p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>{t("jira.points.create")}</li>
            <li>{t("jira.points.autoMap")}</li>
            <li>{t("jira.points.sync")}</li>
          </ul>

          <p className="text-sm text-yellow-600 mt-3">
            ⚠️ {t("jira.warningJira")}
          </p>

          <div className="mt-4">
            <LabelWithTip
              label={
                <span className="text-sm font-medium">
                  {t("jira.labelOneClick")}
                </span>
              }
              tip={
                <span className="max-w-xs block text-sm">{t("jira.tip")}</span>
              }
            />
          </div>
        </FeatureSection>

        {/* Final CTA */}
        <Card className="mt-6">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold">
                {t("headerTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("headerSubtitle")}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button>{t("cta.analyze")}</Button>
              </Link>
              <Link href="/about">
                <Button>{t("cta.about")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
