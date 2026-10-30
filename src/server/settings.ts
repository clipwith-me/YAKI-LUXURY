import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPermission, type Actor } from "@/server/authz/policies";

/**
 * Admin-configurable platform settings. Defaults here only apply until an administrator saves a
 * value; they are configuration, not business rules baked into code paths.
 * Anything with legal/regulatory implications ships DISABLED and is switched on after review.
 */
export const settingSchemas = {
  "attribution.defaultWindowDays": z.number().int().min(1).max(3650),
  "attribution.windowOptions": z.array(z.number().int().min(1).max(3650)).min(1),
  "commission.defaultPaymentTermsDays": z.number().int().min(0).max(365),
  "contact.advisorWhatsapp": z.string().regex(/^\+234\d{10}$/).nullable(),
  "contact.supportEmail": z.string().email().nullable(),
  "contact.supportPhone": z.string().nullable(),
  "legal.entityDisclosure": z.string().max(2000),
  "legal.reviewedByCounsel": z.boolean(),
  "features.publicReviews": z.boolean(),
  "features.whatsappBusinessApi": z.boolean(),
  "features.onlinePayments": z.boolean(),
  "features.showDemoBanner": z.boolean(),
  "features.showExactAddresses": z.boolean(),
  "risk.repeatedPhoneThreshold24h": z.number().int().min(2).max(100),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const settingDefaults: { [K in SettingKey]: SettingValue<K> } = {
  "attribution.defaultWindowDays": 90,
  "attribution.windowOptions": [30, 60, 90, 180, 365],
  "commission.defaultPaymentTermsDays": 30,
  "contact.advisorWhatsapp": null,
  "contact.supportEmail": null,
  "contact.supportPhone": null,
  "legal.entityDisclosure":
    "YAKI'S LUXE HOMES operates a property marketplace and referral platform. Listings are provided by independent partners. YAKI'S LUXE HOMES is not the owner or seller of listed properties unless expressly stated.",
  "legal.reviewedByCounsel": false,
  "features.publicReviews": false,
  "features.whatsappBusinessApi": false,
  "features.onlinePayments": false,
  "features.showDemoBanner": true,
  "features.showExactAddresses": false,
  "risk.repeatedPhoneThreshold24h": 5,
};

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await db.platformSetting.findUnique({ where: { key } });
  if (!row) return settingDefaults[key];
  const parsed = settingSchemas[key].safeParse(row.value);
  return (parsed.success ? parsed.data : settingDefaults[key]) as SettingValue<K>;
}

export async function getAllSettings(): Promise<{ [K in SettingKey]: SettingValue<K> }> {
  const rows = await db.platformSetting.findMany();
  const out = { ...settingDefaults } as Record<SettingKey, unknown>;
  for (const row of rows) {
    if (row.key in settingSchemas) {
      const parsed = settingSchemas[row.key as SettingKey].safeParse(row.value);
      if (parsed.success) out[row.key as SettingKey] = parsed.data;
    }
  }
  return out as { [K in SettingKey]: SettingValue<K> };
}

export async function updateSetting<K extends SettingKey>(actor: Actor, key: K, value: unknown): Promise<void> {
  assertPermission(actor, "settings:manage");
  const parsed = settingSchemas[key].parse(value);
  const before = await getSetting(key);
  await db.platformSetting.upsert({
    where: { key },
    create: { key, value: parsed as never, updatedById: actor.id },
    update: { value: parsed as never, updatedById: actor.id },
  });
  await audit({ actorId: actor.id, action: "setting.updated", entityType: "PlatformSetting", entityId: key, before, after: parsed });
}
