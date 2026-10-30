"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Root } from "./styled";

interface RevealProps {
  children: ReactNode;
}

/** One gentle rise when a block first comes into view. */
export function Reveal({ children }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Root ref={ref} data-in={shown}>
      {children}
    </Root>
  );
}
