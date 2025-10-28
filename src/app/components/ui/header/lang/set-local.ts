"use server";

import { cookies } from "next/headers";

export async function setLocale(locale: "en" | "fr") {
  (await cookies()).set("locale", locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
