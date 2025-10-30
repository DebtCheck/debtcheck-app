"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Section,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Toolbar,
  Button,
} from "@/app/components/ui/utilities";
import { Header } from "../components/header";
import { TechRow, TimelineCard } from "./aboutHelper";
import { motion } from "framer-motion";

export default function AboutPage() {
  const t = useTranslations("About");

  const tech = useMemo(
    () => ({
      frontend: ["Next.js", "React", "Tailwind", "Vercel"],
      backend: ["Rust", "swc_ecma_parser"],
      platform: ["GitHub REST API", "Jira API"],
      data: ["PostgreSQL", "Redis"],
    }),
    []
  );

  const features = useMemo(
    () => [
      {
        id: "deps",
        title: t("featuresPreview.items.deps.title"),
        desc: t("featuresPreview.items.deps.desc"),
      },
      {
        id: "dead",
        title: t("featuresPreview.items.dead.title"),
        desc: t("featuresPreview.items.dead.desc"),
      },
      {
        id: "secrets",
        title: t("featuresPreview.items.secrets.title"),
        desc: t("featuresPreview.items.secrets.desc"),
      },
      {
        id: "activity",
        title: t("featuresPreview.items.activity.title"),
        desc: t("featuresPreview.items.activity.desc"),
      },
      {
        id: "readonly",
        title: t("featuresPreview.items.readonly.title"),
        desc: t("featuresPreview.items.readonly.desc"),
      },
    ],
    [t]
  );

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl min-h-screen space-y-8 mt-5 pt-(--appbar-h) pb-10">
        {/* HERO */}
        <Section
          title={<span className="flex items-center gap-3">{t("title")}</span>}
          subtitle={t("subtitle")}
          actions={
            <Toolbar
              right={
                <div
                  className="flex flex-col-reverse sm:flex-row
        items-end sm:items-center
        justify-end sm:justify-normal
        gap-2"
                >
                  <Link
                    href="https://github.com/AxelGil"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button className="h-10">{t("ctaGitHub")}</Button>
                  </Link>
                  <Link
                    href="https://www.linkedin.com/in/axel-gil"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button className="h-10">{t("ctaLinkedIn")}</Button>
                  </Link>
                  <div className="hidden sm:flex gap-2">
                    <Link
                      href="/cv/CVEN.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="h-10">My CV</Button>
                    </Link>
                    <Link
                      href="/cv/CVFR.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="h-10">Mon CV</Button>
                    </Link>
                  </div>
                </div>
              }
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-6 items-center">
            <div className="mx-auto md:mx-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center justify-center h-44 w-44 md:h-56 md:w-auto rounded-2xl border border-(--line-neutral-20)
                  bg-linear-to-br from-[rgb(var(--surface-2))] via-[rgb(var(--color-primary)/0.04)] to-[rgb(var(--surface-3))] 
                  dark:from-[rgb(var(--surface-1))] dark:via-[rgb(var(--color-primary)/0.05)] dark:to-[rgb(var(--surface-3))]"
              >
                <Image
                  src="/icon0.svg"
                  alt="DebtCheck logo"
                  width={140}
                  height={140}
                  priority
                  className="opacity-95"
                  unoptimized
                />
              </motion.div>
            </div>
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {t("heroTitle")}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {t("heroText.1")} <strong>DebtCheck</strong> {t("heroText.2")}{" "}
                <em>{t("heroText.3")}</em> {t("heroText.4")}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg border border-(--line-neutral-20) px-2 py-1">
                  {t("badges.fullstack")}
                </span>
                <span className="rounded-lg border border-(--line-neutral-20) px-2 py-1">
                  {t("badges.qualityDx")}
                </span>
                <span className="rounded-lg border border-(--line-neutral-20) px-2 py-1">
                  Rust
                </span>
                <span className="rounded-lg border border-(--line-neutral-20) px-2 py-1">
                  Next.js
                </span>
              </div>
            </div>
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Pourquoi DebtCheck */}
          <Section title={t("whyTitle")}>
            <p className="text-sm text-muted-foreground">
              {t("whyText.1")} <strong>DebtCheck</strong> {t("whyText.2")}{" "}
              <em>{t("whyText.3")}</em> {t("whyText.4")}
            </p>
          </Section>

          {/* Tech stack */}
          <Section
            title={t("techStackTitle")}
            subtitle={t("techStackSubtitle")}
          >
            <div className="space-y-3">
              <TechRow label={t("tech.frontendLabel")} items={tech.frontend} />
              <TechRow label={t("tech.backendLabel")} items={tech.backend} />
              <TechRow label={t("tech.platformLabel")} items={tech.platform} />
              <TechRow label={t("tech.dataLabel")} items={tech.data} />
            </div>
          </Section>

          {/* Vision */}
          <Section title={t("visionTitle")} subtitle={t("visionSubtitle")}>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>{t("visionItem1")}</li>
              <li>{t("visionItem2")}</li>
              <li>{t("visionItem3")}</li>
            </ul>
          </Section>
        </div>

        {/* Fonctionnalités (aperçu) */}
        <Section
          className="mt-6"
          title={t("featuresPreviewTitle")}
          subtitle={t("featuresPreviewSubtitle")}
          actions={
            <Link href="/about/features" className="inline-block">
              <Button className="h-10">{t("viewAll")}</Button>
            </Link>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Card key={f.id} className="h-full">
                <CardHeader>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        {/* Parcours */}
        <Section
          className="mt-6"
          title={t("journeyTitle")}
          subtitle={t("journeySubtitle")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TimelineCard
              title={t("journey.sacem.title")}
              place={t("journey.sacem.place")}
              points={[t("journey.sacem.p1"), t("journey.sacem.p2")]}
            />
            <TimelineCard
              title={t("journey.recrutimmo.title")}
              place={t("journey.recrutimmo.place")}
              points={[t("journey.recrutimmo.p1"), t("journey.recrutimmo.p2")]}
            />
            <TimelineCard
              title={t("journey.adico.title")}
              place={t("journey.adico.place")}
              points={[t("journey.adico.p1"), t("journey.adico.p2")]}
            />
            <TimelineCard
              title={t("journey.schools.title")}
              place={t("journey.schools.place")}
              points={[
                t("journey.schools.p1"),
                t("journey.schools.p2"),
                t("journey.schools.p3"),
              ]}
            />
          </div>
        </Section>

        {/* CTA final */}
        <Card className="mt-6">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold">
                {t("ctaFinalTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("ctaFinalSubtitle")}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/about/features">
                <Button>{t("ctaExplore")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-6">
          <Link href="/">
            <Button className="h-11 px-6 text-sm font-semibold bg-[rgb(var(--color-primary))] text-white hover:opacity-90">
              🚀 {t("ctaTryNow")}
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}
