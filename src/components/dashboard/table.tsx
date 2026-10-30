import type { ReactNode } from "react";
import { Badge } from "@/components/ui/primitives";
import { humanize } from "@/lib/labels";

/** Responsive data table: horizontal scroll on small screens, sticky header, quiet styling. */
export function DataTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-stone-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-left">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>;
}

const STATUS_TONE: Record<string, "neutral" | "brass" | "trust" | "danger" | "warning" | "ink"> = {
  NEW: "brass", PENDING: "warning", PENDING_REVIEW: "warning", UNDER_REVIEW: "warning", CHANGES_REQUESTED: "warning", DRAFT: "neutral",
  APPROVED: "trust", PUBLISHED: "trust", ACTIVE: "trust", PAID: "trust", COMMISSION_PAID: "trust", COMPLETED: "trust", CLOSED: "trust", ACCEPTED: "trust", RESOLVED: "trust", SENT: "trust",
  REJECTED: "danger", SUSPENDED: "danger", LOST: "danger", DISPUTED: "danger", CANCELLED: "danger", REVOKED: "danger", OPEN: "danger", FAILED: "danger", NO_SHOW: "danger",
  DUE: "brass", COMMISSION_DUE: "brass", INVOICED: "brass", PARTIALLY_PAID: "brass", COMMISSION_PENDING: "brass", SCHEDULED: "ink", VIEWING_SCHEDULED: "ink",
  ARCHIVED: "neutral", EXPIRED: "neutral", WAIVED: "neutral", DISMISSED: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{humanize(status)}</Badge>;
}
