import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import ClientProviders from "./components/ClientProviders";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { icons } from "lucide-react";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale(); 
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientProviders>
            <Header />
            <main className="min-h-[calc(100svh-var(--footer-h))]
                pt-(--header-h-mobile) sm:pt-(--header-main-padding)
                pb-[calc(var(--footer-h)+env(safe-area-inset-bottom))]">
              {children}
            </main>
            <Footer fixed />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
