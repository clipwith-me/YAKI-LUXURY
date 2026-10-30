import type { PartnerStatus, UserRole } from "@prisma/client";
import { db } from "@/server/db";
import type { Actor } from "@/server/authz/policies";
import { randomCode } from "@/lib/ids";

export async function resetDb() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function makeUser(role: UserRole, name = role): Promise<Actor & { email: string }> {
  const email = `${role.toLowerCase()}-${randomCode(6).toLowerCase()}@test.local`;
  const user = await db.user.create({ data: { email, name, role, passwordHash: "x" } });
  return { id: user.id, role, partnerIds: [], email };
}

export async function makePartner(status: PartnerStatus = "APPROVED", name = "Partner") {
  const owner = await makeUser("PARTNER", `${name} owner`);
  const partner = await db.partner.create({
    data: {
      slug: `${name.toLowerCase()}-${randomCode(5).toLowerCase()}`,
      companyName: name,
      type: "DEVELOPER",
      email: owner.email,
      phone: "+2348031234567",
      officeAddress: "1 Test Road",
      city: "Lagos",
      state: "Lagos",
      status,
      members: { create: { userId: owner.id, role: "OWNER" } },
    },
  });
  const actor: Actor = { ...owner, partnerIds: [partner.id] };
  return { partner, actor };
}

export async function makeLocations() {
  const lagos = await db.location.create({ data: { type: "STATE", name: "Lagos", slug: "lagos", path: "lagos", lat: 6.5, lng: 3.4 } });
  const lekki = await db.location.create({ data: { type: "AREA", name: "Lekki", slug: "lekki", path: "lagos/lekki", parentId: lagos.id, lat: 6.45, lng: 3.47 } });
  const ikoyi = await db.location.create({ data: { type: "AREA", name: "Ikoyi", slug: "ikoyi", path: "lagos/ikoyi", parentId: lagos.id, lat: 6.45, lng: 3.43 } });
  for (const key of ["pool", "security", "power", "gym"]) await db.amenity.create({ data: { key, label: key, category: "x" } });
  return { lagos, lekki, ikoyi };
}

export const sampleProperty = (locationId: string, overrides: Record<string, unknown> = {}) => ({
  title: "Contemporary 5-Bedroom Detached Duplex",
  description: "A beautifully finished five bedroom detached duplex with a pool and smart home features throughout.",
  listingType: "SALE" as const,
  propertyType: "DETACHED_DUPLEX" as const,
  locationId,
  addressLine: `${randomCode(4)} Admiralty Way, Lekki`,
  price: "150,000,000",
  bedrooms: 5,
  bathrooms: 6,
  amenities: ["pool", "security"] as Array<"pool" | "security">,
  imageUrls: ["https://images.unsplash.com/photo-1.jpg"],
  ...overrides,
});

export const sampleInquiry = (propertyId: string, overrides: Record<string, unknown> = {}) => ({
  propertyId,
  type: "VIEWING_REQUEST" as const,
  fullName: "Adaeze Okafor",
  email: `buyer-${randomCode(5).toLowerCase()}@example.com`,
  phone: "0803 123 4567",
  message: "I'd like to view this weekend.",
  preferredContact: "WHATSAPP" as const,
  consent: true as const,
  ...overrides,
});
