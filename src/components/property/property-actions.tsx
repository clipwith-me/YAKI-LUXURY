"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { toggleFavoriteAction, trackShareAction } from "@/app/actions/public";

export function SaveButton({ propertyId, initial, signedIn, variant = "overlay" }: { propertyId: string; initial: boolean; signedIn: boolean; variant?: "overlay" | "inline" }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSaved((s) => !s); // optimistic
    start(async () => {
      const res = await toggleFavoriteAction(propertyId);
      if (res.ok && res.data) setSaved(res.data.saved);
      else setSaved(initial);
    });
  };
  return (
    <button type="button" onClick={onClick} disabled={pending} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save property"} className={cn("flex items-center justify-center gap-2 transition-colors", variant === "overlay" ? "h-9 w-9 rounded-full bg-white/90 text-ink backdrop-blur hover:bg-white" : "h-11 border border-stone-300 px-4 text-sm hover:border-ink", saved && "text-brass-600")}>
      <Icon.Heart filled={saved} size={variant === "overlay" ? 17 : 18} />
      {variant === "inline" && (saved ? "Saved" : "Save")}
    </button>
  );
}

export function ShareButton({ propertyId, title, url, variant = "overlay" }: { propertyId: string; title: string; url: string; variant?: "overlay" | "inline" }) {
  const [copied, setCopied] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    void trackShareAction(propertyId, "native");
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={onClick} aria-label="Share property" className={cn("flex items-center justify-center gap-2", variant === "overlay" ? "h-9 w-9 rounded-full bg-white/90 text-ink backdrop-blur hover:bg-white" : "h-11 border border-stone-300 px-4 text-sm hover:border-ink")}>
      <Icon.Share size={variant === "overlay" ? 16 : 18} />
      {variant === "inline" && (copied ? "Link copied" : "Share")}
    </button>
  );
}

/** Sends the property link (no personal data) to WhatsApp — the channel Nigerian buyers actually use. */
export function WhatsAppShare({ propertyId, title, url }: { propertyId: string; title: string; url: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => void trackShareAction(propertyId, "whatsapp")} className="flex h-11 items-center gap-2 border border-stone-300 px-4 text-sm hover:border-ink">
      <Icon.WhatsApp /> Send to WhatsApp
    </a>
  );
}

const COMPARE_KEY = "ylh-compare";
export function readCompare(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(COMPARE_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function CompareToggle({ propertyId }: { propertyId: string }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(readCompare()), []);
  const active = ids.includes(propertyId);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = active ? ids.filter((i) => i !== propertyId) : [...ids, propertyId].slice(-4);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
    setIds(next);
    window.dispatchEvent(new Event("ylh-compare"));
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={active} className={cn("flex items-center gap-1.5 text-xs tracking-wide transition-colors", active ? "text-brass-600" : "text-stone-500 hover:text-ink")}>
      <Icon.Compare size={14} /> {active ? "Comparing" : "Compare"}
    </button>
  );
}

export function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(readCompare());
    sync();
    window.addEventListener("ylh-compare", sync);
    return () => window.removeEventListener("ylh-compare", sync);
  }, []);
  if (ids.length < 2) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 md:bottom-12">
      <a href={`/compare?ids=${ids.join(",")}`} className="flex items-center gap-3 bg-ink px-5 py-3 text-sm text-ivory shadow-lift">
        <Icon.Compare /> Compare {ids.length} properties <Icon.Arrow size={16} />
      </a>
    </div>
  );
}
