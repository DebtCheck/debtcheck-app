import { Button } from "../buttons/button";
import { Input } from "../base/input";

export type AnalyzeHeroProps = {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
};

export function AnalyzeHero({
  value,
  onChange,
  onAnalyze,
  loading,
  disabled,
  placeholder = "https://github.com/user/repo",
  hint,
}: AnalyzeHeroProps) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <p className="text-sm text-muted-foreground">
        Drop your GitHub repo URL, and we&apos;ll analyze it for technical debt.
      </p>
      <div className="w-full flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          onClick={onAnalyze}
          disabled={disabled || loading || value.length === 0}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
