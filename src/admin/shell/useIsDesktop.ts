"use client";
import { useEffect, useState } from "react";

/** ≥ 1024 px (PRD Phase 2 §5.1). Use only where the structure differs; prefer CSS breakpoints. */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}