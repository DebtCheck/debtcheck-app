"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "@/app/lib/utils";

type PopToastProps = {
  x: number; // viewport coords
  y: number;
  text: string;
  onDone?: () => void;
  durationMs?: number; // default 900
};

export function PopToast({
  x,
  y,
  text,
  onDone,
  durationMs = 900,
}: PopToastProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const boxRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(t);
  }, [onDone, durationMs]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const margin = 8; // px
    const w = boxRef.current?.offsetWidth ?? 0;

    // Center over x
    let left = x - w / 2;

    // Clamp into viewport [margin, window.innerWidth - margin - w]
    const maxLeft = Math.max(margin, window.innerWidth - margin - w);
    left = Math.min(Math.max(left, margin), maxLeft);

    // Place above the anchor (already passed as page Y)
    const top = y - 8; // small gap

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyle({
      position: "fixed",
      left,
      top,
      zIndex: 10000,
    });
  }, [mounted, x, y]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed pointer-events-none z-10000",
          "rounded-xl border border-border/15 bg-popover/95 backdrop-blur",
          "px-3 py-1.5 text-sm text-foreground shadow-xl",
          "transition-all duration-300 ease-out",
          "animate-[pop_300ms_ease-out,fadeOut_900ms_ease-in_forwards_300ms]"
        )}
        style={{ left: x, top: y, transform: "translate(-50%, -120%)" }}
      >
        <span className="inline-flex items-center gap-2">
          <Check className="size-4" />
          {text}
        </span>
      </div>
      <style jsx>{`
        @keyframes pop {
          0% {
            opacity: 0;
            transform: translate(-50%, -8px) scale(0.96);
          }
          60% {
            opacity: 1;
            transform: translate(-50%, -120%) scale(1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -120%) scale(1);
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translate(-50%, -140%) scale(0.98);
          }
        }
      `}</style>
    </>,
    document.body
  );
}
