"use client";
import { useEffect, useState } from "react";
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setM(true), []);
  return m;
}