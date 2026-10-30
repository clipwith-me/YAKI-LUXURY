"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PropertyImage } from "./property-image";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Editorial mosaic on desktop, swipeable carousel on mobile, keyboard-accessible full-screen viewer. */
function layoutFor(count: number): string {
  if (count >= 5) return "grid-cols-4 grid-rows-2";
  if (count >= 3) return "grid-cols-3 grid-rows-2";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-1";
}

export function Gallery({ images, title }: { images: Array<{ url: string; alt: string }>; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, images.length, close]);

  // Mosaic slots: 5 (1 large + 4), 3 (1 large + 2), or one tile per photo below that.
  const shown = images.length >= 5 ? 5 : images.length >= 3 ? 3 : images.length;
  if (!images.length) {
    return <div className="relative aspect-[16/9] bg-stone-100"><PropertyImage alt={title} sizes="100vw" /></div>;
  }

  return (
    <>
      {/* Mobile: native scroll-snap carousel (swipe) */}
      <div className="relative md:hidden">
        <div
          ref={trackRef}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((img, i) => (
            <button key={img.url + i} type="button" onClick={() => setOpen(i)} className="relative aspect-[4/3] w-full shrink-0 snap-center" aria-label={`Open photo ${i + 1} of ${images.length}`}>
              <PropertyImage src={img.url} alt={img.alt} sizes="100vw" priority={i === 0} />
            </button>
          ))}
        </div>
        <span className="absolute bottom-3 right-3 bg-ink/70 px-2 py-1 text-[11px] text-ivory">{index + 1} / {images.length}</span>
      </div>

      {/* Desktop: editorial mosaic that adapts to the number of photos */}
      <div className={cn("hidden h-[min(68vh,640px)] gap-2 md:grid", layoutFor(images.length))}>
        {images.slice(0, shown).map((img, i) => (
          <button key={img.url + i} type="button" onClick={() => setOpen(i)} className={cn("group relative overflow-hidden bg-stone-100", i === 0 && images.length > 2 ? "col-span-2 row-span-2" : "")} aria-label={`Open photo ${i + 1} of ${images.length}`}>
            <PropertyImage src={img.url} alt={img.alt} sizes={i === 0 ? "50vw" : "25vw"} priority={i === 0} className="transition-transform duration-700 group-hover:scale-[1.03]" />
            {i === shown - 1 && images.length > shown && <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-sm tracking-wide text-ivory">+{images.length - shown} photos</span>}
          </button>
        ))}
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[90] flex flex-col bg-ink/95">
          <div className="flex items-center justify-between p-4 text-ivory">
            <span className="text-sm">{open + 1} / {images.length}</span>
            <button type="button" onClick={close} aria-label="Close gallery" className="h-10 w-10"><Icon.Close size={24} /></button>
          </div>
          <div className="relative flex-1">
            <PropertyImage src={images[open]!.url} alt={images[open]!.alt} sizes="100vw" className="!object-contain" />
          </div>
          <div className="flex justify-center gap-4 p-4">
            <button type="button" onClick={() => setOpen((open - 1 + images.length) % images.length)} className="h-11 w-11 border border-ivory/30 text-ivory" aria-label="Previous photo"><Icon.ArrowLeft className="mx-auto" /></button>
            <button type="button" onClick={() => setOpen((open + 1) % images.length)} className="h-11 w-11 border border-ivory/30 text-ivory" aria-label="Next photo"><Icon.Arrow className="mx-auto" /></button>
          </div>
        </div>
      )}
    </>
  );
}
