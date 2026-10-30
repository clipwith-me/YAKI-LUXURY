import { PageTitle } from "@/components/dashboard/shell";
import { DataTable, Td } from "@/components/dashboard/table";
import { requireStaffPage } from "@/server/auth/guards";
import { toActor } from "@/server/action";
import { topPerformers } from "@/server/services/insights";

export default async function Analytics() {
  const user = await requireStaffPage("analytics:read");
  const t = await topPerformers(toActor(user));
  const empty = <p className="p-6 text-center text-sm text-stone-500">No data yet.</p>;
  return (
    <>
      <PageTitle title="Analytics" description="Which properties, partners, neighbourhoods and searches drive the business." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-3 text-xl">Top properties by leads</h2><DataTable head={["Property", "Leads"]} empty={t.properties.length ? null : empty}>{t.properties.map((p) => <tr key={p.id}><Td>{p.title} <span className="font-mono text-xs text-stone-400">{p.reference}</span></Td><Td>{p.leads}</Td></tr>)}</DataTable></section>
        <section><h2 className="mb-3 text-xl">Top partners by closed deals</h2><DataTable head={["Partner", "Deals"]} empty={t.partners.length ? null : empty}>{t.partners.map((p) => <tr key={p.id}><Td>{p.companyName}</Td><Td>{p.deals}</Td></tr>)}</DataTable></section>
        <section><h2 className="mb-3 text-xl">Neighbourhood conversion</h2><DataTable head={["Area", "Leads", "Deals", "Conversion"]} empty={t.locations.length ? null : empty}>{t.locations.map((l) => <tr key={l.name}><Td>{l.name}</Td><Td>{l.leads}</Td><Td>{l.deals}</Td><Td>{l.conversion === null ? "—" : `${l.conversion}%`}</Td></tr>)}</DataTable></section>
        <section><h2 className="mb-3 text-xl">Top search terms</h2><DataTable head={["Term", "Searches"]} empty={t.searchTerms.length ? null : empty}>{t.searchTerms.map((s) => <tr key={s.term}><Td>{s.term}</Td><Td>{s.count}</Td></tr>)}</DataTable></section>
      </div>
    </>
  );
}
