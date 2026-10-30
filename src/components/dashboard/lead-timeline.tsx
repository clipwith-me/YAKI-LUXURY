import { humanize } from "@/lib/labels";

export function LeadTimeline({ events }: { events: Array<{ id: string; type: string; body: string | null; createdAt: Date; actor: string | null; internal?: boolean }> }) {
  return (
    <div className="border border-stone-200 bg-white p-5">
      <h2 className="font-display text-xl">Timeline</h2>
      <ol className="mt-4 space-y-4 border-l border-stone-200 pl-5">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-brass-500" />
            <p className="text-sm font-medium">{humanize(e.type)}{e.internal && <span className="ml-2 text-[10px] uppercase tracking-wider text-stone-400">internal</span>}</p>
            {e.body && <p className="mt-0.5 whitespace-pre-line text-sm text-stone-600">{e.body}</p>}
            <p className="mt-0.5 text-xs text-stone-400">{e.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}{e.actor && ` · ${e.actor}`}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
