"use client";

import * as React from "react";
import * as RT from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import clsx from "clsx";

type HelpTipProps = {
  content: React.ReactNode;
  className?: string;
  delayDurationMs?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  ariaLabel?: string;
};

export function HelpTip({
  content,
  className,
  delayDurationMs = 200,
  side = "top",
  align = "center",
  ariaLabel = "Help",
}: HelpTipProps) {
  return (
    <RT.Provider delayDuration={delayDurationMs}>
      <RT.Root>
        <RT.Trigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={clsx(
              "inline-flex items-center justify-center rounded-full p-1 outline-none",
              "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-offset-2",
              className
            )}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </RT.Trigger>
        <RT.Portal>
          <RT.Content
            side={side}
            align={align}
            className={clsx(
              "z-50 max-w-xs rounded-md px-3 py-2 text-sm shadow-md",
              "bg-[rgb(var(--surface-3))] border border-(--line-neutral-15)"
            )}
          >
            {content}
            <RT.Arrow className="fill-[rgb(var(--surface-3))]" />
          </RT.Content>
        </RT.Portal>
      </RT.Root>
    </RT.Provider>
  );
}
