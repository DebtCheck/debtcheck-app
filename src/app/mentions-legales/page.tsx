import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  return {
    title: `${t("title")} | DebtCheck`,
    robots: { index: true, follow: true },
  };
}

export default function MentionsLegalesPage() {
  const t = useTranslations("Legal");

  return (
    <>
      <main className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-6">{t("title")}</h1>
        <p className="mb-8 text-muted-foreground">{t("intro")}</p>

        <section className="space-y-2 mb-8">
          <h2 className="text-lg font-medium">{t("editor.title")}</h2>
          <p>{t("editor.name")}</p>
          <p>{t("editor.address")}</p>
          <p>{t("editor.contact")}</p>
          <p>{t("editor.responsible")}</p>
        </section>

        <section className="space-y-2 mb-8">
          <h2 className="text-lg font-medium">{t("hosts.title")}</h2>
          <p>{t("hosts.frontend")}</p>
          <p>{t("hosts.backend")}</p>
        </section>

        <section className="space-y-2 mb-8">
          <h2 className="text-lg font-medium">{t("ip.title")}</h2>
          <p>{t("ip.desc")}</p>
        </section>

        <section className="space-y-2 mb-8">
          <h2 className="text-lg font-medium">{t("contact.title")}</h2>
          <p>{t("contact.desc")}</p>
        </section>

        <p>
          <a className="underline" href="/mentions-legales/cgu">
            {t("links.cgu")}
          </a>{" "}
          ·{" "}
          <a className="underline" href="/mentions-legales/confidentialite">
            {t("links.privacy")}
          </a>
        </p>
      </main>
    </>
  );
}
