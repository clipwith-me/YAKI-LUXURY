// Reference data. Coordinates are approximate neighbourhood centroids (for maps only).

type Area = { name: string; slug: string; lat: number; lng: number; description: string; image?: string };
type State = { name: string; slug: string; lat: number; lng: number; active: boolean; sort: number; description: string; areas?: Area[] };

// Unsplash photo ids used for demo imagery (Unsplash License). Replace with partner photography.
export const DEMO_IMAGES = {
  villaPool: "1613490493576-7fde63acd811",
  modernHouse: "1600596542815-ffad4c1539a9",
  modernHouse2: "1600585154340-be6161a56a0c",
  luxuryVilla: "1613977257363-707ba9348227",
  poolHouse: "1512917774080-9991f1c4c750",
  familyHome: "1580587771525-78b9dba3b914",
  townhouse: "1600047509807-ba8f99d2cdde",
  terraceRow: "1605276374104-dee2a0ed3cd6",
  garden: "1564013799919-ab600027ffc6",
  livingBright: "1600607687939-ce8a6c25118c",
  livingWarm: "1600210492486-724fe5c67fb0",
  kitchen: "1600566753190-17f0baa2a6c3",
  kitchenDark: "1600573472550-8090b5e0745e",
  diningRoom: "1617806118233-18e1de247200",
  bedroom: "1616594039964-ae9021a400a0",
  bedroomSoft: "1522708323590-d24dbb6b0267",
  apartmentInterior: "1502672260266-1c1ef2d93688",
  apartmentLiving: "1560448204-e02f11c3d0e2",
  apartmentTower: "1545324418-cc1a3fa10c00",
  apartmentBuilding: "1460317442991-0ec209397118",
  penthouse: "1493809842364-78817add7ffb",
  cityTower: "1486406146926-c627a92ad1ab",
} as const;

export const LOCATIONS: State[] = [
  {
    name: "Lagos",
    slug: "lagos",
    lat: 6.5244,
    lng: 3.3792,
    active: true,
    sort: 1,
    description: "Nigeria's commercial capital — from the established Island neighbourhoods to the fast-growing Lekki–Epe corridor.",
    areas: [
      { name: "Lekki", slug: "lekki", lat: 6.4478, lng: 3.4723, description: "Contemporary homes, gated estates and coastal living along the Lekki corridor.", image: DEMO_IMAGES.villaPool },
      { name: "Ikoyi", slug: "ikoyi", lat: 6.4541, lng: 3.4347, description: "Leafy, established and central — apartments and residences close to the lagoon.", image: DEMO_IMAGES.apartmentTower },
      { name: "Victoria Island", slug: "victoria-island", lat: 6.4281, lng: 3.4219, description: "The business district, with serviced apartments minutes from offices, dining and the waterfront.", image: DEMO_IMAGES.cityTower },
      { name: "Banana Island", slug: "banana-island", lat: 6.4669, lng: 3.4466, description: "An exclusive island enclave of large waterfront homes and private residences.", image: DEMO_IMAGES.luxuryVilla },
      { name: "Ikeja", slug: "ikeja", lat: 6.6018, lng: 3.3515, description: "The state capital on the Mainland, close to the airport and major business hubs.", image: DEMO_IMAGES.apartmentBuilding },
      { name: "Ajah", slug: "ajah", lat: 6.4698, lng: 3.5852, description: "Value and space further along the Lekki corridor, with many new estates.", image: DEMO_IMAGES.familyHome },
      { name: "Chevron", slug: "chevron", lat: 6.4434, lng: 3.531, description: "A popular residential stretch of Lekki with established estates and new developments.", image: DEMO_IMAGES.terraceRow },
      { name: "Sangotedo", slug: "sangotedo", lat: 6.4706, lng: 3.639, description: "A growing community with newer estates and family homes.", image: DEMO_IMAGES.townhouse },
      { name: "Epe", slug: "epe", lat: 6.5841, lng: 3.9834, description: "A coastal town at the far end of the Lekki–Epe corridor with land and long-term projects.", image: DEMO_IMAGES.garden },
      { name: "Yaba", slug: "yaba", lat: 6.5095, lng: 3.3711, description: "A lively Mainland neighbourhood with a strong technology and education presence.", image: DEMO_IMAGES.apartmentInterior },
      { name: "Surulere", slug: "surulere", lat: 6.4969, lng: 3.3481, description: "A central, well-connected Mainland neighbourhood with established communities.", image: DEMO_IMAGES.apartmentLiving },
    ],
  },
  {
    name: "Abuja",
    slug: "abuja",
    lat: 9.0765,
    lng: 7.3986,
    active: true,
    sort: 2,
    description: "The Federal Capital Territory — planned districts, generous plots and diplomatic neighbourhoods.",
    areas: [
      { name: "Maitama", slug: "maitama", lat: 9.0882, lng: 7.4934, description: "One of the capital's most prestigious districts, with large plots and embassies nearby.", image: DEMO_IMAGES.familyHome },
      { name: "Asokoro", slug: "asokoro", lat: 9.0434, lng: 7.5269, description: "Quiet, secure and green — home to substantial residences on the hills.", image: DEMO_IMAGES.modernHouse },
      { name: "Wuse", slug: "wuse", lat: 9.079, lng: 7.47, description: "Central and convenient, with apartments close to shopping and business districts.", image: DEMO_IMAGES.apartmentLiving },
      { name: "Guzape", slug: "guzape", lat: 9.017, lng: 7.505, description: "A newer district known for hillside homes and modern construction.", image: DEMO_IMAGES.modernHouse2 },
      { name: "Jabi", slug: "jabi", lat: 9.07, lng: 7.422, description: "Lakeside living near Jabi Lake, with townhouses and apartments.", image: DEMO_IMAGES.townhouse },
      { name: "Gwarinpa", slug: "gwarinpa", lat: 9.1086, lng: 7.4083, description: "A large residential district popular with families.", image: DEMO_IMAGES.terraceRow },
    ],
  },
  // Expansion markets: present in the data model, hidden until an administrator activates them.
  { name: "Rivers", slug: "rivers", lat: 4.8156, lng: 7.0498, active: false, sort: 10, description: "Port Harcourt and surrounding areas." },
  { name: "Oyo", slug: "oyo", lat: 7.3775, lng: 3.947, active: false, sort: 11, description: "Ibadan and surrounding areas." },
  { name: "Edo", slug: "edo", lat: 6.335, lng: 5.6037, active: false, sort: 12, description: "Benin City and surrounding areas." },
  { name: "Enugu", slug: "enugu", lat: 6.5244, lng: 7.5086, active: false, sort: 13, description: "Enugu city and surrounding areas." },
  { name: "Kano", slug: "kano", lat: 12.0022, lng: 8.592, active: false, sort: 14, description: "Kano city and surrounding areas." },
  { name: "Akwa Ibom", slug: "akwa-ibom", lat: 5.0377, lng: 7.9128, active: false, sort: 15, description: "Uyo and surrounding areas." },
];

export const AMENITIES = [
  { key: "pool", label: "Swimming pool", category: "Leisure" },
  { key: "gym", label: "Gym", category: "Leisure" },
  { key: "cinema", label: "Home cinema", category: "Leisure" },
  { key: "garden", label: "Garden", category: "Outdoor" },
  { key: "balcony", label: "Balcony / terrace", category: "Outdoor" },
  { key: "waterfront", label: "Waterfront", category: "Outdoor" },
  { key: "security", label: "24/7 security", category: "Security" },
  { key: "estate", label: "Gated estate", category: "Security" },
  { key: "parking", label: "Parking", category: "Essentials" },
  { key: "generator", label: "Generator", category: "Utilities" },
  { key: "power", label: "Constant power / inverter", category: "Utilities" },
  { key: "water", label: "Treated water / borehole", category: "Utilities" },
  { key: "smart_home", label: "Smart home", category: "Technology" },
  { key: "elevator", label: "Elevator", category: "Essentials" },
  { key: "bq", label: "Boys' quarters (BQ)", category: "Essentials" },
];
