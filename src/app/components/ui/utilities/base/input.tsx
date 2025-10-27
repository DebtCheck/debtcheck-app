import * as React from "react";
import { cn } from "@/app/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-12 w-full rounded-xl px-4 text-sm",
      "bg-card text-foreground placeholder:text-(--muted-60)",
      "border border-border/10",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      "ring-offset-background focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50 transition",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };