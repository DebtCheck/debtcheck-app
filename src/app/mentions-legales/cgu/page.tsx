import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal.cgu");
  return {
    title: `${t("title")} | DebtCheck`,
    robots: { index: true, follow: true },
  };
}

export default function CGUPage() {
  const t = useTranslations("Legal.cgu");

  return (
    <>
      <main className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-6">{t("title")}</h1>

        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <section key={i} className="space-y-2 mb-6">
            <p>{t(`sections.${i}`)}</p>
          </section>
        ))}

        <p>
          <a className="underline" href="/mentions-legales">
            {t("links.legal")}
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
