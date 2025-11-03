"use client";
import { useEffect, useState } from "react";
import { useMounted } from "./useMounted";

export function useIsMobile(minWidth = 768): boolean {
  const mounted = useMounted();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia(`(max-width:${minWidth - 1}px)`);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mounted, minWidth]);

  return mounted && mobile;
}
