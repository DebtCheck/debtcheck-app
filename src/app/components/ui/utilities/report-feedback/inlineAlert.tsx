import { cn } from "@/app/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export type InlineAlertVariant = "success" | "error" | "warning" | "info";

export type InlineAlertProps = {
  variant: InlineAlertVariant;
  title?: string;
  description?: string;
  className?: string;
};

export function InlineAlert({
  variant,
  title,
  description,
  className,
}: InlineAlertProps) {
  const icon = {
    success: <CheckCircle2 className="w-4 h-4" />,
    error: <XCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  }[variant];

  const tone = {
    success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    error: "bg-red-500/10 text-red-700 border-red-500/20",
    warning: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }[variant];

  return (
    <div
      role="alert"
      className={cn(
        "w-full border rounded-md px-3 py-2 text-sm flex items-start gap-2",
        tone,
        className
      )}
    >
      <span aria-hidden className="mt-0.5">
        {icon}
      </span>
      <div>
        {title && <div className="font-medium leading-5">{title}</div>}
        {description && <div className="text-sm/5">{description}</div>}
      </div>
    </div>
  );
}
