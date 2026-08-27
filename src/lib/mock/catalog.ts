import {
  Concert,
  Country,
  Factory,
  Product,
  ProductCategory,
  SalesChannel,
  Sku,
  Supplier,
  Warehouse,
} from "@/lib/types/entities";
import { addDays } from "./random";

export const REFERENCE_DATE = "2026-08-27";

export const countries: Country[] = [
  { id: "country-kr", code: "KR", name: "South Korea" },
  { id: "country-jp", code: "JP", name: "Japan" },
  { id: "country-us", code: "US", name: "United States" },
  { id: "country-cn", code: "CN", name: "China" },
  { id: "country-vn", code: "VN", name: "Vietnam" },
];

export const artists = [{ id: "artist-nova", name: "NOVA" }];

// Factories — grouped by what they produce, so risk stories (capacity overrun,
// single-supplier dependency) fall out of the structure rather than being bolted on.
export const factories: Factory[] = [
  { id: "factory-a", name: "Factory A (Incheon, Korea)", countryId: "country-kr", productionCapacityPerMonth: 220_000 },
  {
    id: "factory-b",
    name: "Factory B (Shenzhen, China)",
    countryId: "country-cn",
    productionCapacityPerMonth: 45_000,
  },
  { id: "factory-c", name: "Factory C (Ho Chi Minh, Vietnam)", countryId: "country-vn", productionCapacityPerMonth: 380_000 },
  {
    id: "factory-d",
    name: "Factory D (Guangzhou, China)",
    countryId: "country-cn",
    productionCapacityPerMonth: 62_000,
    qualityIssueNote: "Recurring paint-finish defects on the current acrylic stand run (~4% reject rate).",
  },
];

export const suppliers: Supplier[] = [
  { id: "supplier-chipworks", name: "Shenzhen ChipWorks", material: "PCB / LED components", countryId: "country-cn", factoryId: "factory-b" },
  { id: "supplier-mekong", name: "Mekong Textile Mills", material: "Cotton fabric & fleece", countryId: "country-vn", factoryId: "factory-c" },
  { id: "supplier-guangdong-plastics", name: "Guangdong Plastics Co.", material: "ABS / PVC resin", countryId: "country-cn", factoryId: "factory-d" },
  { id: "supplier-incheon-print", name: "Incheon Paper & Print Supply", material: "Paper, ink, lamination film", countryId: "country-kr", factoryId: "factory-a" },
];

export const warehouses: Warehouse[] = [
  { id: "wh-kr", name: "Korea Distribution Center", countryId: "country-kr", type: "distribution_center" },
  { id: "wh-jp", name: "Japan Distribution Center", countryId: "country-jp", type: "distribution_center" },
  { id: "wh-us", name: "US Distribution Center", countryId: "country-us", type: "distribution_center" },
];

export const concerts: Concert[] = [
  { id: "concert-seoul", artistId: "artist-nova", city: "Seoul", countryId: "country-kr", venue: "KSPO Dome", date: addDays(REFERENCE_DATE, 39), expectedAttendance: 45_000 },
  { id: "concert-tokyo", artistId: "artist-nova", city: "Tokyo", countryId: "country-jp", venue: "Tokyo Dome", date: addDays(REFERENCE_DATE, 14), expectedAttendance: 40_000 },
  { id: "concert-osaka", artistId: "artist-nova", city: "Osaka", countryId: "country-jp", venue: "Kyocera Dome", date: addDays(REFERENCE_DATE, 21), expectedAttendance: 15_000 },
  { id: "concert-la", artistId: "artist-nova", city: "Los Angeles", countryId: "country-us", venue: "BMO Stadium", date: addDays(REFERENCE_DATE, 80), expectedAttendance: 18_000 },
  {
    id: "concert-ny",
    artistId: "artist-nova",
    city: "New York",
    countryId: "country-us",
    venue: "Madison Square Garden",
    date: addDays(REFERENCE_DATE, 18),
    expectedAttendance: 16_000,
  },
];

export const salesChannels: SalesChannel[] = [
  { id: "channel-online-kr", name: "NOVA Store Online (KR)", type: "online", countryId: "country-kr" },
  { id: "channel-online-jp", name: "NOVA Store Online (JP)", type: "online", countryId: "country-jp" },
  { id: "channel-online-us", name: "NOVA Store Online (US)", type: "online", countryId: "country-us" },
  { id: "channel-venue-seoul", name: "Seoul Concert Venue", type: "concert_venue", countryId: "country-kr", concertId: "concert-seoul" },
  { id: "channel-venue-tokyo", name: "Tokyo Concert Venue", type: "concert_venue", countryId: "country-jp", concertId: "concert-tokyo" },
  { id: "channel-venue-osaka", name: "Osaka Concert Venue", type: "concert_venue", countryId: "country-jp", concertId: "concert-osaka" },
  { id: "channel-venue-la", name: "LA Concert Venue", type: "concert_venue", countryId: "country-us", concertId: "concert-la" },
  { id: "channel-venue-ny", name: "NY Concert Venue", type: "concert_venue", countryId: "country-us", concertId: "concert-ny" },
];

interface CategorySpec {
  category: ProductCategory;
  productionLeadTimeDays: number;
  factoryId: string;
  unitPrice: number;
  productionCost: number;
  minimumOrderQuantity: number;
  demandRatePerAttendee: number; // baseline units bought per attendee, before region/variant split
  variants: { variant: string; share: number }[];
}

export const categorySpecs: CategorySpec[] = [
  {
    category: "Light Stick",
    productionLeadTimeDays: 45,
    factoryId: "factory-b",
    unitPrice: 55_000,
    productionCost: 26_000,
    minimumOrderQuantity: 3_000,
    demandRatePerAttendee: 0.3,
    variants: [
      { variant: "Ver.3", share: 0.85 },
      { variant: "Ver.2", share: 0.15 },
    ],
  },
  {
    category: "T-shirt",
    productionLeadTimeDays: 20,
    factoryId: "factory-c",
    unitPrice: 39_000,
    productionCost: 15_000,
    minimumOrderQuantity: 2_000,
    demandRatePerAttendee: 0.28,
    variants: [
      { variant: "Black", share: 0.4 },
      { variant: "White", share: 0.28 },
      { variant: "Graphic", share: 0.2 },
      { variant: "Long Sleeve", share: 0.12 },
    ],
  },
  {
    category: "Hoodie",
    productionLeadTimeDays: 24,
    factoryId: "factory-c",
    unitPrice: 69_000,
    productionCost: 28_000,
    minimumOrderQuantity: 1_500,
    demandRatePerAttendee: 0.14,
    variants: [
      { variant: "Black", share: 0.35 },
      { variant: "Gray", share: 0.25 },
      { variant: "Cream", share: 0.2 },
      { variant: "Zip-Up", share: 0.2 },
    ],
  },
  {
    category: "Cap",
    productionLeadTimeDays: 18,
    factoryId: "factory-d",
    unitPrice: 35_000,
    productionCost: 13_000,
    minimumOrderQuantity: 2_000,
    demandRatePerAttendee: 0.12,
    variants: [
      { variant: "Black", share: 0.55 },
      { variant: "Beige", share: 0.45 },
    ],
  },
  {
    category: "Photocard",
    productionLeadTimeDays: 8,
    factoryId: "factory-a",
    unitPrice: 8_000,
    productionCost: 2_000,
    minimumOrderQuantity: 5_000,
    demandRatePerAttendee: 0.55,
    variants: [
      { variant: "Set A", share: 0.55 },
      { variant: "Set B", share: 0.45 },
    ],
  },
  {
    category: "Photocard Set",
    productionLeadTimeDays: 10,
    factoryId: "factory-a",
    unitPrice: 25_000,
    productionCost: 8_000,
    minimumOrderQuantity: 3_000,
    demandRatePerAttendee: 0.1,
    variants: [
      { variant: "Standard Edition", share: 0.6 },
      { variant: "Deluxe Edition", share: 0.4 },
    ],
  },
  {
    category: "Acrylic Stand",
    productionLeadTimeDays: 20,
    factoryId: "factory-d",
    unitPrice: 18_000,
    productionCost: 6_000,
    minimumOrderQuantity: 3_000,
    demandRatePerAttendee: 0.22,
    variants: [
      { variant: "Member A", share: 0.38 },
      { variant: "Member B", share: 0.34 },
      { variant: "Member C", share: 0.28 },
    ],
  },
  {
    category: "Keyring",
    productionLeadTimeDays: 16,
    factoryId: "factory-d",
    unitPrice: 15_000,
    productionCost: 5_000,
    minimumOrderQuantity: 3_000,
    demandRatePerAttendee: 0.2,
    variants: [
      { variant: "Logo", share: 0.4 },
      { variant: "Character", share: 0.35 },
      { variant: "Glow-in-Dark", share: 0.25 },
    ],
  },
  {
    category: "Tote Bag",
    productionLeadTimeDays: 18,
    factoryId: "factory-c",
    unitPrice: 22_000,
    productionCost: 8_000,
    minimumOrderQuantity: 2_000,
    demandRatePerAttendee: 0.12,
    variants: [
      { variant: "Canvas", share: 0.6 },
      { variant: "PVC", share: 0.4 },
    ],
  },
  {
    category: "Poster",
    productionLeadTimeDays: 7,
    factoryId: "factory-a",
    unitPrice: 12_000,
    productionCost: 3_500,
    minimumOrderQuantity: 3_000,
    demandRatePerAttendee: 0.11,
    variants: [
      { variant: "Group A", share: 0.36 },
      { variant: "Group B", share: 0.34 },
      { variant: "Solo", share: 0.3 },
    ],
  },
  {
    category: "Blanket",
    productionLeadTimeDays: 22,
    factoryId: "factory-c",
    unitPrice: 45_000,
    productionCost: 18_000,
    minimumOrderQuantity: 1_000,
    demandRatePerAttendee: 0.05,
    variants: [{ variant: "Fleece", share: 1 }],
  },
  {
    category: "Slogan",
    productionLeadTimeDays: 14,
    factoryId: "factory-c",
    unitPrice: 15_000,
    productionCost: 5_000,
    minimumOrderQuantity: 2_000,
    demandRatePerAttendee: 0.09,
    variants: [{ variant: "Ver.1", share: 1 }],
  },
  {
    category: "Plush Doll",
    productionLeadTimeDays: 30,
    factoryId: "factory-d",
    unitPrice: 35_000,
    productionCost: 15_000,
    minimumOrderQuantity: 1_500,
    demandRatePerAttendee: 0.1,
    variants: [
      { variant: "Classic", share: 0.65 },
      { variant: "Mini", share: 0.35 },
    ],
  },
];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const products: Product[] = categorySpecs.map((spec) => ({
  id: `product-${slug(spec.category)}`,
  artistId: "artist-nova",
  name: `NOVA ${spec.category}`,
  category: spec.category,
  productionLeadTimeDays: spec.productionLeadTimeDays,
}));

export const skus: Sku[] = categorySpecs.flatMap((spec) => {
  const productId = `product-${slug(spec.category)}`;
  return spec.variants.map((v) => ({
    id: `sku-${slug(spec.category)}-${slug(v.variant)}`,
    productId,
    name: `${spec.category} - ${v.variant}`,
    variant: v.variant,
    unitPrice: spec.unitPrice,
    productionCost: spec.productionCost,
    factoryId: spec.factoryId,
    minimumOrderQuantity: spec.minimumOrderQuantity,
  }));
});

// Region multiplier: overseas fans buy more per-capita at the venue since official
// merch is harder to access outside Korea/online.
export const regionMultiplier: Record<string, number> = {
  "country-kr": 0.85,
  "country-jp": 1.15,
  "country-us": 1.3,
};

export function getCategorySpec(category: ProductCategory): CategorySpec {
  const spec = categorySpecs.find((c) => c.category === category);
  if (!spec) throw new Error(`Unknown category: ${category}`);
  return spec;
}
