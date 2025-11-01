import { Metadata } from "next";
import FeaturesClient from "./featuresClient";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Features");
  return {
    title: `${t("title")} | DebtCheck`,
    robots: { index: true, follow: true },
  };
}

export default function FeaturesPage() {
  return <FeaturesClient />;
}
