import { PageTitle } from "@/components/dashboard/shell";
import { BarChart } from "@/components/dashboard/charts";
import { DataTable, Td } from "@/components/dashboard/table";
import { Stat } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { revenueReport, type RevenueRow } from "@/server/services/insights";
import { formatNaira, formatNairaCompact, koboToNaira } from "@/lib/money";

function Breakdown({ title, rows }: { title: string; rows: RevenueRow[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xl">{title}</h2>
      <DataTable head={["", "Deals", "Expected", "Received"]} empty={rows.length ? null : <p className="p-6 text-center text-sm text-stone-500">No commission yet.</p>}>
        {rows.map((r) => <tr key={r.label}><Td>{r.label}</Td><Td>{r.count}</Td><Td>{formatNaira(r.expected)}</Td><Td>{formatNaira(r.paid)}</Td></tr>)}
      </DataTable>
    </section>
  );
}

export default async function Revenue() {
  const user = await requireStaffPage("revenue:read");
  const r = await revenueReport(toActor(user));
  const total = r.monthly.reduce((s, m) => s + m.expected, 0n);
  const received = r.monthly.reduce((s, m) => s + m.paid, 0n);
  return (
    <>
      <PageTitle title="Revenue" description="Referral commission by deal closing date. YAKI revenue only — never customer property payments." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Commission (12 months)" value={formatNaira(total)} />
        <Stat label="Received (12 months)" value={formatNaira(received)} />
        <Stat label="Average per deal" value={r.averagePerDeal ? formatNaira(r.averagePerDeal) : "—"} hint={`${r.deals} deals`} />
      </div>
      <section className="mt-8 border border-stone-200 bg-white p-6">
        <h2 className="mb-6 font-display text-2xl">Monthly commission</h2>
        <BarChart data={r.monthly.map((m) => ({ label: m.label, value: koboToNaira(m.expected), secondary: koboToNaira(m.paid) }))} format={(n) => formatNairaCompact(BigInt(Math.round(n * 100)))} primaryLabel="Expected" secondaryLabel="Received" />
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Breakdown title="Quarterly" rows={r.quarterly} />
        <Breakdown title="Annual" rows={r.annual} />
        <Breakdown title="By partner" rows={r.byPartner} />
        <Breakdown title="By property" rows={r.byProperty} />
        <Breakdown title="By location" rows={r.byLocation} />
        <Breakdown title="By acquisition source" rows={r.bySource} />
      </div>
    </>
  );
}
