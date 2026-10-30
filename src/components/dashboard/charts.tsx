/**
 * Minimal, accessible SVG charts — no charting dependency. Each chart also renders its data as a
 * visually hidden table for screen readers.
 */
export function BarChart({ data, format, height = 220, secondaryLabel, primaryLabel }: { data: Array<{ label: string; value: number; secondary?: number }>; format: (n: number) => string; height?: number; primaryLabel: string; secondaryLabel?: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-stone-500">No data yet.</p>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const w = 100 / data.length;
  return (
    <figure>
      <div className="flex items-end gap-1" style={{ height }} aria-hidden>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end" style={{ maxWidth: `${w}%` }}>
            <div className="relative w-full bg-stone-200" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }}>
              {d.secondary !== undefined && <div className="absolute bottom-0 w-full bg-ink" style={{ height: `${d.value ? Math.min(100, (d.secondary / d.value) * 100) : 0}%` }} />}
            </div>
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-1.5 py-0.5 text-[10px] text-ivory group-hover:block">{format(d.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] text-stone-500" aria-hidden>{data.map((d) => <span key={d.label} className="flex-1 truncate text-center">{d.label}</span>)}</div>
      <figcaption className="mt-3 flex gap-4 text-xs text-stone-600" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-stone-200" />{primaryLabel}</span>
        {secondaryLabel && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-ink" />{secondaryLabel}</span>}
      </figcaption>
      <table className="sr-only"><caption>{primaryLabel}</caption><tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{format(d.value)}</td>{d.secondary !== undefined && <td>{format(d.secondary)}</td>}</tr>)}</tbody></table>
    </figure>
  );
}

export function Funnel({ steps }: { steps: Array<{ label: string; value: number; rate?: number | null }> }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.label}>
          <div className="flex justify-between text-sm"><span>{s.label}</span><span className="tabular-nums">{s.value.toLocaleString()}{s.rate !== undefined && <span className="ml-2 text-xs text-stone-500">{s.rate === null ? "—" : `${s.rate}%`}</span>}</span></div>
          <div className="mt-1 h-2 bg-stone-100"><div className="h-2 bg-brass-500" style={{ width: `${(s.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ol>
  );
}
