/**
 * Seed data — separate from migrations.
 *
 * Reference data (locations, amenities, settings) is always seeded.
 * DEMO DATA (fictional partners, listings, articles, demo staff logins) is seeded only outside
 * production, or when SEED_DEMO=true. Every demo record has isDemo=true and "(Demo)" in its name.
 * No leads, deals or commissions are seeded: transaction data must come from real activity.
 */
import "dotenv/config";
import { PrismaClient, type PropertyType, type ListingType, type PricePeriod } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { settingDefaults } from "../src/server/settings";
import { LOCATIONS, AMENITIES, DEMO_IMAGES } from "./seed-data/reference";
import { DEMO_ARTICLES } from "./seed-data/articles";

const db = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1800&q=80`;

async function seedReference() {
  for (const state of LOCATIONS) {
    const parent = await db.location.upsert({
      where: { path: state.slug },
      create: { type: "STATE", name: state.name, slug: state.slug, path: state.slug, lat: state.lat, lng: state.lng, isActive: state.active, sortOrder: state.sort, description: state.description },
      update: { name: state.name, lat: state.lat, lng: state.lng, description: state.description },
    });
    for (const [i, area] of (state.areas ?? []).entries()) {
      await db.location.upsert({
        where: { path: `${state.slug}/${area.slug}` },
        create: { type: "AREA", name: area.name, slug: area.slug, path: `${state.slug}/${area.slug}`, parentId: parent.id, lat: area.lat, lng: area.lng, sortOrder: i, description: area.description, heroImage: area.image ? img(area.image) : null },
        update: { name: area.name, lat: area.lat, lng: area.lng, description: area.description, heroImage: area.image ? img(area.image) : null },
      });
    }
  }
  for (const a of AMENITIES) {
    await db.amenity.upsert({ where: { key: a.key }, create: a, update: { label: a.label, category: a.category } });
  }
  for (const [key, value] of Object.entries(settingDefaults)) {
    await db.platformSetting.upsert({ where: { key }, create: { key, value: value as never }, update: {} });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping super-admin creation.");
    return null;
  }
  return db.user.upsert({
    where: { email },
    create: { email, name: "Platform Administrator", role: "SUPER_ADMIN", passwordHash: await hashPassword(password) },
    update: {},
  });
}

const DEMO_PASSWORD = "DemoPass-2026!";

async function seedDemoStaff() {
  const staff = [
    ["leads@yaki.demo", "Demo Lead Manager", "LEAD_MANAGER"],
    ["listings@yaki.demo", "Demo Property Manager", "PROPERTY_MANAGER"],
    ["partners@yaki.demo", "Demo Partner Manager", "PARTNER_MANAGER"],
    ["finance@yaki.demo", "Demo Finance", "FINANCE"],
    ["content@yaki.demo", "Demo Content Manager", "CONTENT_MANAGER"],
    ["support@yaki.demo", "Demo Support", "SUPPORT"],
    ["customer@yaki.demo", "Demo Customer", "CUSTOMER"],
  ] as const;
  const hash = await hashPassword(DEMO_PASSWORD);
  for (const [email, name, role] of staff) {
    const user = await db.user.upsert({ where: { email }, create: { email, name, role, passwordHash: hash }, update: {} });
    if (role === "CUSTOMER") {
      await db.customer.upsert({ where: { email }, create: { email, fullName: name, userId: user.id, phone: "+2348000000001" }, update: {} });
    }
  }
}

type DemoPartner = {
  slug: string;
  companyName: string;
  type: "DEVELOPER" | "AGENCY" | "REAL_ESTATE_COMPANY";
  status: "APPROVED" | "PENDING";
  city: string;
  state: string;
  description: string;
  areasServed: string[];
  agreement?: { rateBps: number; windowDays: number; paymentTermsDays: number };
  verified?: boolean;
  featured?: boolean;
};

const DEMO_PARTNERS: DemoPartner[] = [
  {
    slug: "harbourline-developments-demo",
    companyName: "Harbourline Developments (Demo)",
    type: "DEVELOPER",
    status: "APPROVED",
    city: "Lekki",
    state: "Lagos",
    description: "A fictional developer used to demonstrate the platform. Builds contemporary homes along the Lekki corridor.",
    areasServed: ["Lekki", "Ajah", "Chevron", "Sangotedo", "Banana Island"],
    agreement: { rateBps: 200, windowDays: 90, paymentTermsDays: 30 },
    verified: true,
    featured: true,
  },
  {
    slug: "crestview-realty-demo",
    companyName: "Crestview Realty (Demo)",
    type: "AGENCY",
    status: "APPROVED",
    city: "Ikoyi",
    state: "Lagos",
    description: "A fictional agency used to demonstrate the platform. Markets apartments and penthouses on the Island and in Abuja.",
    areasServed: ["Ikoyi", "Victoria Island", "Ikeja", "Wuse", "Jabi"],
    agreement: { rateBps: 300, windowDays: 60, paymentTermsDays: 14 },
  },
  {
    slug: "savannah-court-homes-demo",
    companyName: "Savannah Court Homes (Demo)",
    type: "DEVELOPER",
    status: "APPROVED",
    city: "Maitama",
    state: "FCT Abuja",
    description: "A fictional Abuja developer used to demonstrate the platform. Focuses on large-plot family homes.",
    areasServed: ["Maitama", "Asokoro", "Guzape", "Wuse"],
    agreement: { rateBps: 250, windowDays: 180, paymentTermsDays: 30 },
    verified: true,
  },
  {
    slug: "lagoonfront-properties-demo",
    companyName: "Lagoonfront Properties (Demo)",
    type: "REAL_ESTATE_COMPANY",
    status: "PENDING",
    city: "Victoria Island",
    state: "Lagos",
    description: "A fictional applicant awaiting review — use it to try the partner approval workflow.",
    areasServed: ["Victoria Island", "Ikoyi"],
  },
];

type DemoProperty = {
  partner: string;
  location: string;
  title: string;
  listingType: ListingType;
  propertyType: PropertyType;
  naira: number;
  period?: PricePeriod;
  beds: number;
  baths: number;
  size?: number;
  plot?: number;
  parking?: number;
  luxury?: boolean;
  featured?: boolean;
  furnished?: boolean;
  serviced?: boolean;
  offPlan?: boolean;
  newBuild?: boolean;
  development?: string;
  completion?: string;
  amenities: string[];
  features: string[];
  images: string[];
  status?: "PUBLISHED" | "PENDING_REVIEW";
  verify?: Array<"LISTING_VERIFIED" | "INSPECTION_COMPLETED">;
  daysAgo: number;
};

const P = DEMO_IMAGES;
const DEMO_PROPERTIES: DemoProperty[] = [
  { partner: "harbourline-developments-demo", location: "lagos/lekki", title: "Contemporary 5-Bedroom Detached Duplex with Pool", listingType: "SALE", propertyType: "DETACHED_DUPLEX", naira: 285_000_000, beds: 5, baths: 6, size: 520, plot: 650, parking: 4, luxury: true, featured: true, newBuild: true, amenities: ["pool", "security", "power", "bq", "smart_home", "parking", "estate"], features: ["Double-volume living room", "Fitted kitchen with island", "Family lounge", "Rooftop terrace", "Boys' quarters"], images: [P.villaPool, P.livingBright, P.kitchen, P.bedroom, P.modernHouse], verify: ["LISTING_VERIFIED"], daysAgo: 3 },
  { partner: "crestview-realty-demo", location: "lagos/ikoyi", title: "Lagoon-View 3-Bedroom Serviced Apartment", listingType: "SALE", propertyType: "APARTMENT", naira: 240_000_000, beds: 3, baths: 4, size: 240, parking: 2, luxury: true, serviced: true, amenities: ["waterfront", "gym", "elevator", "pool", "security", "power", "water"], features: ["Floor-to-ceiling glazing", "Lagoon views", "Concierge", "Two parking bays"], images: [P.apartmentLiving, P.apartmentTower, P.kitchenDark, P.bedroomSoft], daysAgo: 6 },
  { partner: "harbourline-developments-demo", location: "lagos/banana-island", title: "Waterfront 6-Bedroom Villa with Private Jetty", listingType: "SALE", propertyType: "VILLA", naira: 1_200_000_000, beds: 6, baths: 7, size: 950, plot: 1400, parking: 6, luxury: true, featured: true, amenities: ["waterfront", "pool", "cinema", "smart_home", "security", "power", "garden", "bq", "gym"], features: ["Private jetty", "Home cinema", "Staff quarters", "Landscaped garden", "Wine room"], images: [P.luxuryVilla, P.poolHouse, P.livingWarm, P.diningRoom, P.bedroom], verify: ["LISTING_VERIFIED", "INSPECTION_COMPLETED"], daysAgo: 10 },
  { partner: "crestview-realty-demo", location: "lagos/victoria-island", title: "Furnished 2-Bedroom Apartment, Fully Serviced", listingType: "RENT", propertyType: "APARTMENT", naira: 18_000_000, period: "PER_YEAR", beds: 2, baths: 3, size: 140, parking: 1, furnished: true, serviced: true, amenities: ["gym", "elevator", "security", "power", "water", "parking"], features: ["Fully furnished", "24-hour concierge", "Service charge included"], images: [P.apartmentInterior, P.apartmentBuilding, P.kitchen], daysAgo: 2 },
  { partner: "savannah-court-homes-demo", location: "abuja/maitama", title: "Classic 5-Bedroom Detached House on a Large Plot", listingType: "SALE", propertyType: "DETACHED_DUPLEX", naira: 650_000_000, beds: 5, baths: 6, size: 610, plot: 1200, parking: 5, luxury: true, amenities: ["garden", "security", "power", "bq", "parking", "water"], features: ["Mature garden", "Separate guest chalet", "Study", "Two living rooms"], images: [P.familyHome, P.livingBright, P.diningRoom, P.garden], daysAgo: 14 },
  { partner: "savannah-court-homes-demo", location: "abuja/asokoro", title: "Hillside 6-Bedroom Villa with Garden Terraces", listingType: "SALE", propertyType: "VILLA", naira: 900_000_000, beds: 6, baths: 7, size: 820, plot: 1500, parking: 6, luxury: true, featured: true, amenities: ["pool", "garden", "security", "power", "smart_home", "gym", "bq"], features: ["Terraced gardens", "Infinity pool", "Gym", "Staff quarters"], images: [P.modernHouse, P.poolHouse, P.livingWarm, P.bedroomSoft], verify: ["LISTING_VERIFIED"], daysAgo: 8 },
  { partner: "harbourline-developments-demo", location: "lagos/lekki", title: "4-Bedroom Semi-Detached Duplex in a Gated Estate", listingType: "SALE", propertyType: "SEMI_DETACHED_DUPLEX", naira: 165_000_000, beds: 4, baths: 5, size: 300, parking: 2, newBuild: true, amenities: ["estate", "security", "power", "bq", "parking"], features: ["Gated estate", "Ensuite bedrooms", "Fitted kitchen"], images: [P.townhouse, P.kitchen, P.bedroom], daysAgo: 1 },
  { partner: "harbourline-developments-demo", location: "lagos/chevron", title: "Off-Plan 4-Bedroom Terrace at The Meridian (Demo)", listingType: "SALE", propertyType: "TERRACE", naira: 120_000_000, beds: 4, baths: 5, size: 260, parking: 2, offPlan: true, development: "The Meridian Terraces (Demo)", completion: "2027-12-01", amenities: ["estate", "security", "power", "gym", "pool"], features: ["Flexible payment plan (agreed directly with the developer)", "Clubhouse", "Children's play area"], images: [P.terraceRow, P.livingBright, P.apartmentBuilding], daysAgo: 4 },
  { partner: "savannah-court-homes-demo", location: "abuja/guzape", title: "New-Build 5-Bedroom Duplex with Panoramic Views", listingType: "SALE", propertyType: "DETACHED_DUPLEX", naira: 480_000_000, beds: 5, baths: 6, size: 560, plot: 900, parking: 4, luxury: true, newBuild: true, amenities: ["smart_home", "security", "power", "bq", "balcony", "parking"], features: ["Panoramic hill views", "Wraparound balcony", "Smart lighting"], images: [P.modernHouse2, P.livingWarm, P.kitchenDark], daysAgo: 5 },
  { partner: "crestview-realty-demo", location: "lagos/ikeja", title: "3-Bedroom Apartment near Ikeja GRA", listingType: "RENT", propertyType: "APARTMENT", naira: 7_500_000, period: "PER_YEAR", beds: 3, baths: 3, size: 160, parking: 1, amenities: ["security", "power", "water", "parking"], features: ["Close to the airport", "Ensuite bedrooms"], images: [P.apartmentInterior, P.bedroomSoft], daysAgo: 7 },
  { partner: "crestview-realty-demo", location: "abuja/wuse", title: "3-Bedroom Serviced Apartment in Wuse 2", listingType: "RENT", propertyType: "APARTMENT", naira: 12_000_000, period: "PER_YEAR", beds: 3, baths: 4, size: 190, parking: 2, serviced: true, furnished: true, amenities: ["gym", "pool", "security", "power", "elevator"], features: ["Serviced", "Furnished", "Walk to restaurants"], images: [P.apartmentLiving, P.kitchen, P.bedroom], daysAgo: 9 },
  { partner: "crestview-realty-demo", location: "lagos/ikoyi", title: "Penthouse with Private Rooftop Terrace", listingType: "SALE", propertyType: "PENTHOUSE", naira: 750_000_000, beds: 4, baths: 5, size: 480, parking: 3, luxury: true, featured: true, amenities: ["waterfront", "pool", "gym", "elevator", "smart_home", "security", "power", "balcony"], features: ["Private rooftop terrace", "Private lift lobby", "Lagoon and city views"], images: [P.penthouse, P.livingWarm, P.diningRoom, P.bedroom], daysAgo: 12 },
  { partner: "harbourline-developments-demo", location: "lagos/sangotedo", title: "3-Bedroom Terrace in a Secure Estate", listingType: "SALE", propertyType: "TERRACE", naira: 75_000_000, beds: 3, baths: 4, size: 180, parking: 1, newBuild: true, amenities: ["estate", "security", "power", "parking"], features: ["Secure estate", "Allocated parking"], images: [P.terraceRow, P.kitchen], daysAgo: 11 },
  { partner: "crestview-realty-demo", location: "abuja/jabi", title: "Lakeside 4-Bedroom Townhouse", listingType: "RENT", propertyType: "TOWNHOUSE", naira: 15_000_000, period: "PER_YEAR", beds: 4, baths: 5, size: 280, parking: 2, amenities: ["security", "power", "garden", "parking"], features: ["Near Jabi Lake", "Private garden"], images: [P.townhouse, P.livingBright], daysAgo: 13 },
  { partner: "harbourline-developments-demo", location: "lagos/ajah", title: "4-Bedroom Detached Duplex Awaiting Review", listingType: "SALE", propertyType: "DETACHED_DUPLEX", naira: 140_000_000, beds: 4, baths: 5, size: 320, parking: 2, amenities: ["security", "power", "bq"], features: ["Submitted by partner — try approving it in the admin"], images: [P.familyHome], status: "PENDING_REVIEW", daysAgo: 0 },
];

function description(p: DemoProperty, area: string): string {
  return [
    `DEMO LISTING — this property is fictional and exists only to demonstrate YAKI'S LUXE HOMES.`,
    `${p.title} in ${area}. ${p.beds > 0 ? `${p.beds} bedrooms and ${p.baths} bathrooms` : "A well-located plot"}${p.size ? ` across approximately ${p.size} sqm` : ""}.`,
    p.features.length ? `Highlights include ${p.features.slice(0, 3).join(", ").toLowerCase()}.` : "",
    `All information is supplied by the listing partner. Prospective buyers and tenants should carry out independent checks and take independent legal advice before any commitment.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function seedDemo(adminId: string | null) {
  await seedDemoStaff();
  const hash = await hashPassword(DEMO_PASSWORD);

  for (const [i, dp] of DEMO_PARTNERS.entries()) {
    const ownerEmail = `owner@${dp.slug.replace(/-demo$/, "")}.demo`;
    const owner = await db.user.upsert({ where: { email: ownerEmail }, create: { email: ownerEmail, name: `${dp.companyName.replace(" (Demo)", "")} Owner (Demo)`, role: "PARTNER", passwordHash: hash, phone: `+23480000001${i}0` }, update: {} });
    const partner = await db.partner.upsert({
      where: { slug: dp.slug },
      create: {
        slug: dp.slug,
        companyName: dp.companyName,
        type: dp.type,
        status: dp.status,
        description: dp.description,
        email: ownerEmail,
        phone: `+23480000001${i}0`,
        officeAddress: `Demo address, ${dp.city}`,
        city: dp.city,
        state: dp.state,
        areasServed: dp.areasServed,
        propertyCategories: ["Residential"],
        approvedAt: dp.status === "APPROVED" ? new Date(Date.now() - (120 + i * 40) * 864e5) : null,
        approvedById: dp.status === "APPROVED" ? adminId : null,
        isDemo: true,
        members: { create: { userId: owner.id, role: "OWNER" } },
      },
      update: {},
    });
    if (dp.agreement && !(await db.partnerAgreement.findFirst({ where: { partnerId: partner.id } }))) {
      await db.partnerAgreement.create({
        data: {
          partnerId: partner.id,
          reference: `YLA-DEMO-${String(i + 1).padStart(3, "0")}`,
          agreementDate: new Date("2026-06-01"),
          startDate: new Date("2026-06-01"),
          commissionType: "PERCENTAGE",
          commissionRateBps: dp.agreement.rateBps,
          attributionWindowDays: dp.agreement.windowDays,
          paymentTermsDays: dp.agreement.paymentTermsDays,
          status: "ACTIVE",
          specialConditions: "DEMO DATA — fictional agreement for demonstration only.",
          createdById: adminId,
        },
      });
    }
    if (adminId && (dp.verified || dp.featured)) {
      for (const category of [...(dp.verified ? (["PARTNER_VERIFIED"] as const) : []), ...(dp.featured ? (["FEATURED_PARTNER"] as const) : [])]) {
        if (!(await db.verificationRecord.findFirst({ where: { partnerId: partner.id, category } }))) {
          await db.verificationRecord.create({
            data: { subjectType: "PARTNER", partnerId: partner.id, category, status: "ACTIVE", verifiedById: adminId, verifiedAt: new Date(), reviewDueAt: new Date(Date.now() + 365 * 864e5), publicNote: "Demo record for illustration only.", internalNotes: "DEMO DATA — not a real verification." },
          });
        }
      }
    }
  }

  const amenities = await db.amenity.findMany();
  for (const [i, dp] of DEMO_PROPERTIES.entries()) {
    const slug = `${dp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${dp.location.split("/")[1]}-demo`;
    if (await db.property.findUnique({ where: { slug } })) continue;
    const partner = await db.partner.findUniqueOrThrow({ where: { slug: dp.partner } });
    const location = await db.location.findUniqueOrThrow({ where: { path: dp.location } });
    const publishedAt = new Date(Date.now() - dp.daysAgo * 864e5);
    // Jitter demo coordinates slightly around the area centroid so map pins don't stack.
    const jitter = () => (Math.random() - 0.5) * 0.012;
    const property = await db.property.create({
      data: {
        reference: `YLP-DEMO${String(i + 1).padStart(2, "0")}`,
        slug,
        partnerId: partner.id,
        locationId: location.id,
        title: dp.title,
        description: description(dp, location.name),
        listingType: dp.listingType,
        propertyType: dp.propertyType,
        status: dp.status ?? "PUBLISHED",
        priceKobo: BigInt(dp.naira) * 100n,
        pricePeriod: dp.period ?? "TOTAL",
        bedrooms: dp.beds,
        bathrooms: dp.baths,
        sizeSqm: dp.size,
        plotSizeSqm: dp.plot,
        parkingSpaces: dp.parking,
        addressLine: `Demo address ${i + 1}, ${location.name}`,
        lat: (location.lat ?? 0) + jitter(),
        lng: (location.lng ?? 0) + jitter(),
        furnished: dp.furnished ?? false,
        serviced: dp.serviced ?? false,
        offPlan: dp.offPlan ?? false,
        newConstruction: dp.newBuild ?? false,
        isLuxury: dp.luxury ?? false,
        featured: dp.featured ?? false,
        developmentName: dp.development,
        developerName: dp.development ? partner.companyName : undefined,
        completionDate: dp.completion ? new Date(dp.completion) : undefined,
        features: dp.features,
        submittedAt: publishedAt,
        reviewedAt: dp.status === "PENDING_REVIEW" ? null : publishedAt,
        reviewedById: dp.status === "PENDING_REVIEW" ? null : adminId,
        publishedAt: dp.status === "PENDING_REVIEW" ? null : publishedAt,
        documentationInfo: "DEMO DATA — no documents exist for this fictional listing.",
        isDemo: true,
        amenities: { create: dp.amenities.map((k) => ({ amenityId: amenities.find((a) => a.key === k)!.id })) },
        images: { create: dp.images.map((id, n) => ({ url: img(id), alt: `${dp.title} — demo photo ${n + 1}`, sortOrder: n, isCover: n === 0 })) },
      },
    });
    for (const category of dp.verify ?? []) {
      if (!adminId) break;
      await db.verificationRecord.create({
        data: { subjectType: "PROPERTY", propertyId: property.id, category, status: "ACTIVE", verifiedById: adminId, verifiedAt: publishedAt, reviewDueAt: new Date(Date.now() + 180 * 864e5), publicNote: "Demo record for illustration only.", internalNotes: "DEMO DATA — not a real verification." },
      });
    }
  }

  for (const { daysAgo, coverImage, ...article } of DEMO_ARTICLES) {
    await db.article.upsert({
      where: { slug: article.slug },
      create: { ...article, coverImage: img(coverImage), status: "PUBLISHED", publishedAt: new Date(Date.now() - daysAgo * 864e5), isDemo: true },
      update: {},
    });
  }
}

async function main() {
  await seedReference();
  const admin = await seedAdmin();
  const demo = process.env.SEED_DEMO === "true" || process.env.NODE_ENV !== "production";
  if (demo) await seedDemo(admin?.id ?? null);
  console.info(`Seed complete${demo ? ` (with DEMO DATA; demo password: ${DEMO_PASSWORD})` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
