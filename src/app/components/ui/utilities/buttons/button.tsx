import * as React from "react";
import { cn } from "@/app/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition",
      "cursor-pointer",
      "bg-foreground text-background hover:opacity-90 hover:shadow-md hover:-translate-y-[1px]",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      "ring-offset-background focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "border border-border/10",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      "ring-offset-background focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

export { Button };