import { PageTitle } from "@/components/dashboard/shell";
import { SettingsForm } from "@/components/admin/forms";
import { Notice } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/auth/guards";
import { getAllSettings } from "@/server/settings";

export default async function Settings() {
  await requireStaffPage("settings:manage");
  return (
    <>
      <PageTitle title="Platform settings" description="Every change is audited." />
      <Notice tone="brass" className="mb-6">Features with licensing, payments, data-protection or consumer-protection implications ship switched off. Enable them only after review by qualified Nigerian legal and financial professionals.</Notice>
      <SettingsForm values={await getAllSettings()} />
    </>
  );
}
