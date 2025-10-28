"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { ButtonDropdown } from "../../utilities/buttons/buttonDropdown";
import { setLocale } from "./set-local";
import { PopToast } from "../../utilities/buttons/popToast";

type Locale = "en" | "fr";

export function LocaleDropdown() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const locale = useLocale() as Locale;

  const [toast, setToast] = useState<null | {
    x: number;
    y: number;
    text: string;
  }>(null);

  const items = [
    { id: "en", label: "English (EN)" },
    { id: "fr", label: "Français (FR)" },
  ] as const;

  return (
    <>
      <ButtonDropdown
        buttonLabel={
          <span className="inline-flex items-center gap-2">
            <Languages className="size-4 opacity-80" />
            {locale.toUpperCase()}
          </span>
        }
        items={items}
        onSelect={(id: string) =>
          start(async () => {
            await setLocale(id as Locale);
            router.refresh();
          })
        }
        onSelectEx={({ label, anchorRect }) => {
          const x = anchorRect.left + anchorRect.width / 2;
          const y = anchorRect.top + window.scrollY;
          setToast({ x, y, text: label });
        }}
        disabled={pending}
        aria-label="Select language"
        align="end"
      />
      {toast && (
        <PopToast
          x={toast.x}
          y={toast.y}
          text={toast.text}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}
