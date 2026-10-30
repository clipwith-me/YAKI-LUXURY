"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Responsive, lazy-loaded property photo. If a remote image fails (moved, blocked, offline) we show
 * a composed placeholder instead of a broken-image icon — including failures that happen before
 * hydration, which React's onError would miss.
 */
export function PropertyImage({ src, alt, sizes, priority, className }: { src?: string | null; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const checkLoaded = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (!src || failed) {
    return (
      <div role="img" aria-label={alt} className={cn("absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-300 via-stone-200 to-brass-100", className)}>
        <span className="flex h-14 w-14 items-center justify-center border border-stone-400/60 font-display text-2xl text-stone-500/80">Y</span>
      </div>
    );
  }
  const local = src.startsWith("/");
  return <Image ref={checkLoaded} src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={local} onError={() => setFailed(true)} className={cn("object-cover", className)} />;
}
