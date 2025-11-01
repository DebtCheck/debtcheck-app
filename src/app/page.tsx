import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HomeClient from "./components/homeClient";


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home");
  return {
    title: `${t("title")} | DebtCheck`,
    robots: { index: true, follow: true },
  };
}

export default function Page() {
  // Server component that renders your client UI
  return <HomeClient />;
}