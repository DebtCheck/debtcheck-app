"use client";

import * as React from "react";
import { HelpTip } from "./helpTip";

type LabelWithTipProps = {
  label: string | React.ReactNode;
  tip: React.ReactNode;
  ariaLabel?: string;
};

export function LabelWithTip({ label, tip, ariaLabel }: LabelWithTipProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <HelpTip
        content={tip}
        ariaLabel={ariaLabel ?? "Help for " + String(label)}
      />
    </span>
  );
}
