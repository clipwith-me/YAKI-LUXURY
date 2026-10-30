import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { BADGE_COPY } from "@/server/services/verification";
import type { VerificationCategory } from "@prisma/client";

type BadgeRecord = { category: VerificationCategory; verifiedAt: Date | null };

/**
 * Renders badges ONLY for records passed in (which come from ACTIVE staff verifications).
 * Each badge carries its precise meaning as a tooltip/title so it can never over-claim.
 */
export function VerificationBadges({ records, size = "sm", className }: { records: BadgeRecord[]; size?: "sm" | "md"; className?: string }) {
  const unique = records.filter((r, i, arr) => arr.findIndex((x) => x.category === r.category) === i && r.category !== "FEATURED_PARTNER");
  if (!unique.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {unique.map((r) => {
        const copy = BADGE_COPY[r.category];
        return (
          <li key={r.category} title={`${copy.label}${r.verifiedAt ? ` — ${r.verifiedAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}` : ""}. ${copy.meaning}`} className={cn("inline-flex items-center gap-1 bg-trust-50 font-medium text-trust", size === "sm" ? "px-1.5 py-0.5 text-[10px] tracking-wide" : "px-2.5 py-1 text-xs")}>
            <Icon.Shield size={size === "sm" ? 12 : 14} /> {copy.label}
          </li>
        );
      })}
    </ul>
  );
}
