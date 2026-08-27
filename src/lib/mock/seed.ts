import {
  DailySales,
  DemandForecast,
  Inventory,
  MockDatabase,
  ProductionOrder,
  PurchaseOrder,
  Shipment,
  SupplyChainEvent,
} from "@/lib/types/entities";
import {
  artists,
  categorySpecs,
  concerts,
  countries,
  factories,
  products,
  regionMultiplier,
  REFERENCE_DATE,
  salesChannels,
  skus,
  suppliers,
  warehouses,
} from "./catalog";
import { addDays, createRng, daysBetween, randInt } from "./random";

const rng = createRng(20260827);

const PRODUCTION_MULTIPLIER = 0.9; // fraction of full-tour demand produced per run

// Which country's concert(s) a warehouse is sized against. Japan and the US each
// run two shows off one DC — the smaller/later one draws against the same pool.
const PRIMARY_CONCERT_BY_WAREHOUSE: Record<string, string> = {
  "wh-kr": "concert-seoul",
  "wh-jp": "concert-tokyo",
  "wh-us": "concert-la",
};

// ---- Hero risk scenarios -------------------------------------------------
// Everything else is formulaic; these overrides guarantee the demo's headline
// causal chain (and its supporting cast) lands on specific, legible numbers.

const FORECAST_OVERRIDES: Record<string, number> = {
  "sku-light-stick-ver-3|concert-tokyo": 12_500,
  "sku-light-stick-ver-3|concert-seoul": 6_200,
  "sku-t-shirt-black|concert-tokyo": 8_800,
  "sku-acrylic-stand-member-b|concert-ny": 3_400,
};

const INVENTORY_OVERRIDES: Record<string, { quantity: number; reserved: number }> = {
  "sku-light-stick-ver-3|wh-jp": { quantity: 10_000, reserved: 0 },
  "sku-light-stick-ver-3|wh-kr": { quantity: 9_000, reserved: 200 },
  "sku-t-shirt-black|wh-jp": { quantity: 6_000, reserved: 0 },
  "sku-acrylic-stand-member-b|wh-us": { quantity: 2_200, reserved: 100 },
  "sku-hoodie-cream|wh-us": { quantity: 9_000, reserved: 300 },
  "sku-blanket-fleece|wh-us": { quantity: 6_000, reserved: 200 },
};

// Factory D (Guangzhou) is deliberately over capacity; these SKUs' production
// orders are the ones that actually slip as a result.
const CAPACITY_DELAYED_SKUS = new Set([
  "sku-acrylic-stand-member-a",
  "sku-acrylic-stand-member-b",
  "sku-acrylic-stand-member-c",
  "sku-keyring-glow-in-dark",
]);

function skuById(id: string) {
  const sku = skus.find((s) => s.id === id)!;
  const product = products.find((p) => p.id === sku.productId)!;
  return { sku, product };
}

function buildDailySales(forecastQty: number): DailySales[] {
  const dailySales: DailySales[] = [];
  const horizonDays = 30;
  const dailyBase = forecastQty / 55;
  for (let i = horizonDays; i >= 1; i--) {
    const date = addDays(REFERENCE_DATE, -i);
    const trend = 1 + (horizonDays - i) / horizonDays;
    const noise = 0.75 + rng() * 0.5;
    dailySales.push({ date, quantity: Math.max(0, Math.round(dailyBase * trend * noise)) });
  }
  return dailySales;
}

function buildDemandForecasts(): DemandForecast[] {
  const forecasts: DemandForecast[] = [];
  for (const spec of categorySpecs) {
    for (const variant of spec.variants) {
      const skuId = `sku-${slugify(spec.category)}-${slugify(variant.variant)}`;
      for (const concert of concerts) {
        const overrideKey = `${skuId}|${concert.id}`;
        let forecastQuantity: number;
        if (FORECAST_OVERRIDES[overrideKey] != null) {
          forecastQuantity = FORECAST_OVERRIDES[overrideKey];
        } else {
          const region = regionMultiplier[concert.countryId] ?? 1;
          const base = concert.expectedAttendance * spec.demandRatePerAttendee * variant.share * region;
          const noise = 0.85 + rng() * 0.3;
          forecastQuantity = Math.max(50, Math.round((base * noise) / 10) * 10);
        }
        forecasts.push({ skuId, concertId: concert.id, forecastQuantity, dailySales: buildDailySales(forecastQuantity) });
      }
    }
  }
  return forecasts;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function forecastLookup(forecasts: DemandForecast[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of forecasts) map.set(`${f.skuId}|${f.concertId}`, f.forecastQuantity);
  return map;
}

function buildInventory(forecasts: DemandForecast[]): Inventory[] {
  const fMap = forecastLookup(forecasts);
  const inventory: Inventory[] = [];

  for (const sku of skus) {
    for (const warehouse of warehouses) {
      const overrideKey = `${sku.id}|${warehouse.id}`;
      const override = INVENTORY_OVERRIDES[overrideKey];
      let quantity: number;
      let reserved: number;
      if (override) {
        quantity = override.quantity;
        reserved = override.reserved;
      } else {
        const primaryConcertId = PRIMARY_CONCERT_BY_WAREHOUSE[warehouse.id];
        const reference = fMap.get(`${sku.id}|${primaryConcertId}`) ?? 0;
        const coverage = 1.05 + rng() * 0.35; // 1.05x-1.4x the primary show's forecast
        quantity = Math.max(sku.minimumOrderQuantity * 0.3, Math.round((reference * coverage) / 10) * 10);
        reserved = Math.round(quantity * (0.05 + rng() * 0.07));
      }
      const safetyStock = Math.round(quantity * 0.15);
      inventory.push({ skuId: sku.id, warehouseId: warehouse.id, quantity, reserved, safetyStock });
    }
  }
  return inventory;
}

function buildPurchaseOrders(): PurchaseOrder[] {
  return suppliers.map((supplier, i) => {
    const isHeroDelay = supplier.id === "supplier-chipworks";
    const orderDate = addDays(REFERENCE_DATE, -randInt(rng, 12, 22));
    const leadTimeDays = isHeroDelay ? 18 : randInt(rng, 10, 16);
    const delayDays = isHeroDelay ? randInt(rng, 6, 9) : rng() < 0.15 ? randInt(rng, 1, 4) : 0;
    const expectedDeliveryDate = addDays(orderDate, leadTimeDays);
    const actualDeliveryProjection = addDays(orderDate, leadTimeDays + delayDays);
    const arrived = daysBetween(actualDeliveryProjection, REFERENCE_DATE) >= 0;
    return {
      id: `po-supplier-${i + 1}`,
      supplierId: supplier.id,
      factoryId: supplier.factoryId,
      material: supplier.material,
      quantity: randInt(rng, 40_000, 120_000),
      unit: "units",
      orderDate,
      expectedDeliveryDate,
      status: arrived ? "delivered" : delayDays > 0 ? "delayed" : "in_transit",
      delayDays,
    };
  });
}

function buildProductionOrders(forecasts: DemandForecast[]): ProductionOrder[] {
  const fMap = forecastLookup(forecasts);
  const orders: ProductionOrder[] = [];
  let seq = 1;

  for (const sku of skus) {
    const { product } = skuById(sku.id);
    const totalForecast = concerts.reduce((sum, c) => sum + (fMap.get(`${sku.id}|${c.id}`) ?? 0), 0);
    const quantity = Math.max(sku.minimumOrderQuantity, Math.round(totalForecast * PRODUCTION_MULTIPLIER));

    const isLightStickHero = sku.id === "sku-light-stick-ver-3";
    const isCapacityDelayed = CAPACITY_DELAYED_SKUS.has(sku.id);

    const orderDate = addDays(REFERENCE_DATE, -randInt(rng, 8, 22));
    const baseLeadTime = product.productionLeadTimeDays;
    const delayDays = isLightStickHero
      ? randInt(rng, 6, 9)
      : isCapacityDelayed
        ? randInt(rng, 5, 10)
        : rng() < 0.12
          ? randInt(rng, 1, 4)
          : 0;
    const expectedCompletionDate = addDays(orderDate, baseLeadTime + delayDays);
    const completed = daysBetween(expectedCompletionDate, REFERENCE_DATE) >= 0;

    orders.push({
      id: `po-${seq++}`,
      skuId: sku.id,
      factoryId: sku.factoryId,
      quantity,
      orderDate,
      expectedCompletionDate,
      status: completed ? "completed" : delayDays > 0 ? "delayed" : "in_progress",
      delayDays,
    });
  }
  return orders;
}

const ROUTE_LEAD_TIME: Record<string, number> = {
  "factory-a|wh-kr": 3,
  "factory-b|wh-kr": 9,
  "factory-c|wh-kr": 12,
  "factory-d|wh-kr": 9,
  "wh-kr|wh-jp": 5,
  "wh-kr|wh-us": 10,
};

function buildShipmentLeg(
  seq: number,
  skuId: string,
  fromId: string,
  fromType: "factory" | "warehouse",
  toWarehouseId: string,
  quantity: number,
  leadTimeDays: number,
  delayDays: number
): Shipment {
  const departureDate = addDays(REFERENCE_DATE, -randInt(rng, 1, 6));
  const expectedArrival = addDays(departureDate, leadTimeDays);
  const actualArrival = addDays(departureDate, leadTimeDays + delayDays);
  const arrived = daysBetween(actualArrival, REFERENCE_DATE) >= 0;
  return {
    id: `ship-${seq}`,
    skuId,
    fromId,
    fromType,
    toWarehouseId,
    quantity,
    departureDate,
    expectedArrival,
    actualArrival,
    leadTimeDays,
    status: arrived ? "delivered" : delayDays > 0 ? "delayed" : "in_transit",
    delayDays,
  };
}

function buildShipments(inventory: Inventory[]): Shipment[] {
  const shipments: Shipment[] = [];
  let seq = 1;

  for (const sku of skus) {
    const invBySku = inventory.filter((i) => i.skuId === sku.id);
    const krInv = invBySku.find((i) => i.warehouseId === "wh-kr")?.quantity ?? 0;

    // Leg 1: factory -> Korea DC (all production lands in Korea first).
    const leg1LeadTime = ROUTE_LEAD_TIME[`${sku.factoryId}|wh-kr`] ?? 8;
    const leg1Delay = rng() < 0.1 ? randInt(rng, 1, 3) : 0;
    shipments.push(
      buildShipmentLeg(seq++, sku.id, sku.factoryId, "factory", "wh-kr", Math.round(krInv * 0.4), leg1LeadTime, leg1Delay)
    );

    // Leg 2: Korea DC -> Japan / US DC.
    for (const destWarehouseId of ["wh-jp", "wh-us"]) {
      const destInv = invBySku.find((i) => i.warehouseId === destWarehouseId)?.quantity ?? 0;
      const leadTime = ROUTE_LEAD_TIME[`wh-kr|${destWarehouseId}`] ?? 8;
      const isLightStickToJapan = sku.id === "sku-light-stick-ver-3" && destWarehouseId === "wh-jp";
      const delayDays = isLightStickToJapan ? randInt(rng, 4, 7) : rng() < 0.12 ? randInt(rng, 1, 3) : 0;
      shipments.push(
        buildShipmentLeg(seq++, sku.id, "wh-kr", "warehouse", destWarehouseId, Math.round(destInv * 0.25), leadTime, delayDays)
      );
    }
  }
  return shipments;
}

function buildEvents(): SupplyChainEvent[] {
  return [
    // --- Chain 1: Light Stick / Tokyo — the headline scenario ---
    {
      id: "event-1",
      type: "supplier_delay",
      relatedSkuId: "sku-light-stick-ver-3",
      relatedEntityId: "supplier-chipworks",
      date: addDays(REFERENCE_DATE, -18),
      description: "Shenzhen ChipWorks' PCB/LED component delivery to Factory B slipped ~7 days.",
      descriptionKo: "Shenzhen ChipWorks의 PCB/LED 부품 공급이 Factory B로 약 7일 지연되었습니다.",
    },
    {
      id: "event-2",
      type: "production_delay",
      relatedSkuId: "sku-light-stick-ver-3",
      relatedEntityId: "factory-b",
      date: addDays(REFERENCE_DATE, -9),
      description: "Light Stick Ver.3 production at Factory B delayed ~7 days as a direct result of the component delay.",
      descriptionKo: "부품 공급 지연의 직접적인 영향으로 Factory B의 Light Stick Ver.3 생산이 약 7일 지연되었습니다.",
    },
    {
      id: "event-3",
      type: "demand_spike",
      relatedSkuId: "sku-light-stick-ver-3",
      relatedEntityId: "concert-tokyo",
      date: addDays(REFERENCE_DATE, -10),
      description: "Tokyo Dome demand forecast revised up after both nights sold out.",
      descriptionKo: "도쿄돔 양일 매진 이후 수요 예측이 상향 조정되었습니다.",
    },
    {
      id: "event-4",
      type: "shipment_delay",
      relatedSkuId: "sku-light-stick-ver-3",
      relatedEntityId: "wh-jp",
      date: addDays(REFERENCE_DATE, -3),
      description: "Korea DC -> Japan DC shipment for Light Stick Ver.3 delayed 4-7 days at customs, despite Korea DC holding surplus stock.",
      descriptionKo: "Korea DC에는 여유 재고가 있음에도, 일본행 Light Stick Ver.3 배송이 통관에서 4~7일 지연되었습니다.",
    },
    {
      id: "event-5",
      type: "shortage_detected",
      relatedSkuId: "sku-light-stick-ver-3",
      relatedEntityId: "wh-jp",
      date: REFERENCE_DATE,
      description: "Japan DC inventory (10,000) projected below Tokyo concert demand (12,500) — 2,500 unit gap.",
      descriptionKo: "일본 물류센터 재고(10,000개)가 도쿄 콘서트 예상 수요(12,500개)에 못 미쳐 2,500개 부족이 예상됩니다.",
    },
    {
      id: "event-6",
      type: "shortage_detected",
      relatedSkuId: "sku-t-shirt-black",
      relatedEntityId: "wh-jp",
      date: REFERENCE_DATE,
      description: "T-shirt - Black demand at Tokyo is outpacing the original Japan DC allocation — 2,800 unit gap projected.",
      descriptionKo: "T-shirt - Black의 도쿄 수요가 당초 일본 물류센터 배분량을 넘어서, 2,800개 부족이 예상됩니다.",
    },
    {
      id: "event-7",
      type: "revenue_at_risk",
      relatedEntityId: "concert-tokyo",
      date: REFERENCE_DATE,
      description: "Combined Light Stick + T-shirt - Black shortage puts an estimated ₩246M of Tokyo concert revenue at risk.",
      descriptionKo: "Light Stick와 T-shirt - Black의 동시 부족으로 도쿄 콘서트 예상 매출 약 2억 4,600만 원이 위험에 노출되었습니다.",
    },
    // --- Chain 2: Factory D capacity overrun ---
    {
      id: "event-8",
      type: "capacity_exceeded",
      relatedEntityId: "factory-d",
      date: addDays(REFERENCE_DATE, -5),
      description: "Factory D (Guangzhou) is running above its rated monthly capacity — Acrylic Stand and Keyring orders are slipping.",
      descriptionKo: "Factory D(광저우)가 월 생산 능력을 초과 운영 중이며, 아크릴 스탠드와 키링 오더가 지연되고 있습니다.",
    },
    {
      id: "event-9",
      type: "production_delay",
      relatedSkuId: "sku-acrylic-stand-member-b",
      relatedEntityId: "factory-d",
      date: addDays(REFERENCE_DATE, -4),
      description: "Acrylic Stand production also hit by a paint-finish quality issue at Factory D (~4% reject rate), compounding the delay.",
      descriptionKo: "Factory D의 도색 품질 이슈(불량률 약 4%)가 겹치며 아크릴 스탠드 생산 지연이 심화되었습니다.",
    },
    // --- Chain 3: New York — late-added show, demand spike + lead-time squeeze ---
    {
      id: "event-10",
      type: "demand_spike",
      relatedSkuId: "sku-acrylic-stand-member-b",
      relatedEntityId: "concert-ny",
      date: addDays(REFERENCE_DATE, -7),
      description: "The New York show was announced late and sold out in hours — Acrylic Stand (Member B) demand there is far above the original DC plan.",
      descriptionKo: "뉴욕 공연이 늦게 발표되어 수 시간 내 매진되면서, 아크릴 스탠드(Member B) 수요가 당초 물류 계획을 크게 초과했습니다.",
    },
    {
      id: "event-11",
      type: "shortage_detected",
      relatedSkuId: "sku-acrylic-stand-member-b",
      relatedEntityId: "wh-us",
      date: REFERENCE_DATE,
      description: "Acrylic Stand (Member B) production lead time (20 days) exceeds the days remaining before the New York show — a new run cannot land in time.",
      descriptionKo: "아크릴 스탠드(Member B)의 생산 리드타임(20일)이 뉴욕 공연까지 남은 기간보다 길어, 추가 생산으로는 제때 대응할 수 없습니다.",
    },
  ];
}

export function buildMockDatabase(): MockDatabase {
  const demandForecasts = buildDemandForecasts();
  const inventory = buildInventory(demandForecasts);
  const purchaseOrders = buildPurchaseOrders();
  const productionOrders = buildProductionOrders(demandForecasts);
  const shipments = buildShipments(inventory);
  const events = buildEvents();

  return {
    countries,
    artists,
    products,
    skus,
    factories,
    suppliers,
    purchaseOrders,
    productionOrders,
    warehouses,
    inventory,
    shipments,
    salesChannels,
    concerts,
    demandForecasts,
    events,
    referenceDate: REFERENCE_DATE,
  };
}

let cached: MockDatabase | null = null;

export function getMockDatabase(): MockDatabase {
  if (!cached) cached = buildMockDatabase();
  return cached;
}
