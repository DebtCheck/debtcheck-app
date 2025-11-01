import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal.privacy");
  return {
    title: `${t("title")} | DebtCheck`,
    robots: { index: true, follow: true },
  };
}

export default function ConfidentialitePage() {
  const t = useTranslations("Legal.privacy");

  return (
    <>
      <main className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-6">{t("title")}</h1>

        <section className="space-y-2 mb-6">
          <p>{t("controller")}</p>
          <p>{t("data")}</p>
          <p>{t("purpose")}</p>
          <p>{t("legal")}</p>
          <p>{t("retention")}</p>
          <p>{t("share")}</p>
          <p>{t("rights")}</p>
          <p>{t("cookies")}</p>
        </section>

        <p>
          <a className="underline" href="/mentions-legales">
            {t("links.legal")}
          </a>{" "}
          ·{" "}
          <a className="underline" href="/mentions-legales/cgu">
            {t("links.cgu")}
          </a>
        </p>
      </main>
    </>
  );
}
