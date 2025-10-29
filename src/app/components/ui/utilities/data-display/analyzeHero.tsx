// components/ui/utilities/hero/AnalyzeHero.tsx
import { cn } from "@/app/lib/utils";
import { Input } from "../base/input";
import { Button } from "../buttons/button";
import { useId } from "react";

type AnalyzeHeroVariant = "header" | "card";
type AnalyzeHeroSize = "sm" | "md";

export type AnalyzeHeroProps = {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  variant?: AnalyzeHeroVariant;
  size?: AnalyzeHeroSize;
  // header-only extras
  ctaLabel?: string;             // default: "Analyze"
  loadingLabel?: string;         // default: "Analyzing…"
  className?: string;
};

export function AnalyzeHero({
  value,
  onChange,
  onAnalyze,
  loading,
  disabled,
  placeholder = "https://github.com/user/repo",
  hint,
  variant = "card",
  size = "md",
  ctaLabel = "Analyze",
  loadingLabel = "Analyzing…",
  className,
}: AnalyzeHeroProps) {
  const id = useId();
  const isHeader = variant === "header";
  const isSm = size === "sm";

  // layout tokens
  const container =
    isHeader
      ? "w-full flex items-center gap-2"
      : "flex flex-col items-center text-center gap-3";

  const inputClasses =
    isHeader
      ? (isSm ? "h-10" : "h-12")
      : "flex-1";

  const buttonClasses =
    isHeader
      ? (isSm ? "h-10 px-4" : "h-12 px-5")
      : undefined;

  return (
    <div className={container + (className ? ` ${className}` : "")}>
      {!isHeader && (
        <p className="text-sm text-muted-foreground">
          Drop your GitHub repo URL, and we&apos;ll analyze it for technical debt.
        </p>
      )}

      <div className={isHeader ? "flex-1 flex items-center gap-2" : "w-full flex gap-2"}>
        

        <label htmlFor={id} className="sr-only">GitHub repository URL</label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled && !loading && value.length > 0) {
              onAnalyze();
            }
          }}
        />

        <Button
          onClick={onAnalyze}
          disabled={disabled || loading || value.length === 0}
          className={cn(
            buttonClasses,
            "w-[200px]",
          )}
        >
          {loading ? loadingLabel : ctaLabel}
        </Button>
      </div>

      {!isHeader && hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}