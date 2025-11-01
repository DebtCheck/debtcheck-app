import { Metadata } from "next";
import AboutClient from "./aboutClient";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return {
    title: `${t("title")} | DebtCheck`,
    robots: { index: true, follow: true },
  };
}

export default function AboutPage() {
  return <AboutClient />;
}
