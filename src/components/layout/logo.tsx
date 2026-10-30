import Link from "next/link";
import { cn } from "@/lib/cn";

/** Interim wordmark. Replace with the final brand identity assets when available. */
export function Logo({ tone = "ink", className }: { tone?: "ink" | "ivory"; className?: string }) {
  return (
    <Link href="/" aria-label="YAKI'S LUXE HOMES — home" className={cn("group inline-flex items-center gap-3", className)}>
      <span className={cn("flex h-9 w-9 items-center justify-center border font-display text-lg", tone === "ink" ? "border-ink text-ink" : "border-ivory/80 text-ivory")}>Y</span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[19px] tracking-[0.12em]", tone === "ink" ? "text-ink" : "text-ivory")}>YAKI&apos;S</span>
        <span className={cn("mt-1 text-[9px] font-medium tracking-[0.42em]", tone === "ink" ? "text-brass-600" : "text-brass-300")}>LUXE HOMES</span>
      </span>
    </Link>
  );
}
