import * as React from "react";
import { cn } from "@/app/lib/utils";

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm transition-colors",
        "bg-[rgb(var(--color-card))] text-[rgb(var(--color-foreground))] border-[color:var(--border-20)]",
        className
      )}
      {...rest}
    />
  );
}

function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  // ❗️no background here—inherit from Card so theme can flip
  return <div className={cn("p-6", className)} {...rest} />;
}

function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        "px-6 py-4 flex items-center justify-between border-b",
        "border-[color:var(--line-neutral-20)]",
        className
      )}
      {...rest}
    />
  );
}

function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props;
  return <h3 className={cn("text-base font-semibold", className)} {...rest} />;
}

export { Card, CardContent, CardHeader, CardTitle };
