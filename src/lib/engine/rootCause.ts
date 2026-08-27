import {
  getConcertById,
  getConcerts,
  getEventsBySku,
  getFactoryById,
  getProductionOrdersBySku,
  getPurchaseOrdersBySupplier,
  getShipmentsBySku,
  getSkuById,
  getSuppliersByFactory,
  getWarehouseById,
} from "@/lib/data";
import { Locale } from "@/lib/i18n/dictionary";
import { localizeCity, localizeFactory, localizeWarehouse } from "@/lib/i18n/domain";
import { getSupplyRiskRows, SupplyRiskRow } from "./shortagePrediction";
import { getFactoryStatus } from "./factory";

export type HopStatus = "good" | "warning" | "delayed";

export interface SupplyChainHop {
  stage: "supplier" | "factory" | "shipment_to_hub" | "shipment_to_dc" | "warehouse" | "concert";
  label: string;
  status: HopStatus;
  detail: string;
}

export interface RootCauseTrace {
  row: SupplyRiskRow;
  hops: SupplyChainHop[];
  causalChain: string[];
  revenueAtRisk: number;
  relevantEventIds: string[];
}

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

function pickWorstPurchaseOrder(factoryId: string) {
  const supplier = getSuppliersByFactory(factoryId)[0];
  if (!supplier) return { supplier: undefined, purchaseOrder: undefined };
  const pos = getPurchaseOrdersBySupplier(supplier.id);
  const purchaseOrder = pos.find((p) => p.status === "delayed") ?? pos[0];
  return { supplier, purchaseOrder };
}

export function getRootCauseTrace(skuId: string, concertId: string, locale: Locale = "ko"): RootCauseTrace | undefined {
  const row = getSupplyRiskRows().find((r) => r.skuId === skuId && r.concertId === concertId);
  if (!row) return undefined;

  const sku = getSkuById(skuId)!;
  const concert = getConcertById(concertId)!;
  const factory = getFactoryById(sku.factoryId)!;
  const factoryStatus = getFactoryStatus(sku.factoryId);
  const { supplier, purchaseOrder } = pickWorstPurchaseOrder(sku.factoryId);

  const productionOrders = getProductionOrdersBySku(skuId);
  const productionOrder = productionOrders.find((p) => p.status === "delayed") ?? productionOrders[0];

  const shipments = getShipmentsBySku(skuId);
  const hubLeg = shipments.find((s) => s.fromType === "factory");
  const destLeg = shipments.find((s) => s.fromType === "warehouse" && s.toWarehouseId === row.warehouseId);

  const warehouse = getWarehouseById(row.warehouseId)!;

  const t = (ko: string, en: string) => (locale === "ko" ? ko : en);
  const factoryName = localizeFactory(factory.name, locale);
  const warehouseName = localizeWarehouse(warehouse.name, locale);
  const cityName = localizeCity(concert.city, locale);

  // ---- Structured supply chain hops (Factory -> PO -> Shipment -> DC -> Concert) ----
  const hops: SupplyChainHop[] = [];

  if (supplier) {
    const delayed = purchaseOrder?.status === "delayed";
    hops.push({
      stage: "supplier",
      label: t(supplier.name, supplier.name),
      status: delayed ? "delayed" : "good",
      detail: delayed
        ? t(
            `${supplier.material} 공급이 ${purchaseOrder!.delayDays}일 지연`,
            `${supplier.material} delivery delayed ${purchaseOrder!.delayDays} ${dayWord(purchaseOrder!.delayDays)}`
          )
        : t(`${supplier.material} 공급 정상`, `${supplier.material} supply on schedule`),
    });
  }

  hops.push({
    stage: "factory",
    label: factoryName,
    status: productionOrder?.status === "delayed" ? "delayed" : factoryStatus?.isOverCapacity ? "warning" : "good",
    detail:
      productionOrder?.status === "delayed"
        ? t(
            `생산 오더 ${productionOrder.delayDays}일 지연 (수량 ${productionOrder.quantity.toLocaleString()})`,
            `Production order delayed ${productionOrder.delayDays} ${dayWord(productionOrder.delayDays)} (qty ${productionOrder.quantity.toLocaleString()})`
          )
        : factoryStatus?.isOverCapacity
          ? t(
              `가동률 ${factoryStatus.utilizationPct}%로 생산 능력 초과`,
              `Running at ${factoryStatus.utilizationPct}% of monthly capacity — over capacity`
            )
          : t("생산 정상 진행", "Production on track"),
  });

  if (hubLeg) {
    hops.push({
      stage: "shipment_to_hub",
      label: t("공장 → 한국 물류센터", "Factory → Korea DC"),
      status: hubLeg.status === "delayed" ? "delayed" : "good",
      detail:
        hubLeg.status === "delayed"
          ? t(`${hubLeg.delayDays}일 지연`, `Delayed ${hubLeg.delayDays} ${dayWord(hubLeg.delayDays)}`)
          : t("정상 운송 중", "On schedule"),
    });
  }

  if (destLeg && row.warehouseId !== "wh-kr") {
    hops.push({
      stage: "shipment_to_dc",
      label: t(`한국 물류센터 → ${warehouseName}`, `Korea DC → ${warehouseName}`),
      status: destLeg.status === "delayed" ? "delayed" : "good",
      detail:
        destLeg.status === "delayed"
          ? t(`${destLeg.delayDays}일 지연`, `Delayed ${destLeg.delayDays} ${dayWord(destLeg.delayDays)}`)
          : t("정상 운송 중", "On schedule"),
    });
  }

  hops.push({
    stage: "warehouse",
    label: warehouseName,
    status: row.shortageQty > 0 ? "delayed" : row.surplusQty > 0 ? "warning" : "good",
    detail: t(
      `가용 재고 ${row.availableQty.toLocaleString()}개 (보유 ${row.inventoryQty.toLocaleString()} - 예약 ${row.reservedQty.toLocaleString()})`,
      `${row.availableQty.toLocaleString()} available (${row.inventoryQty.toLocaleString()} on hand - ${row.reservedQty.toLocaleString()} reserved)`
    ),
  });

  hops.push({
    stage: "concert",
    label: t(`${cityName} 콘서트 (D-${row.daysToConcert})`, `${cityName} concert (D-${row.daysToConcert})`),
    status: row.shortageQty > 0 ? "delayed" : "good",
    detail: t(
      `예상 수요 ${row.forecastQty.toLocaleString()}개`,
      `Forecast demand ${row.forecastQty.toLocaleString()} units`
    ),
  });

  // ---- Causal chain narrative: start from authored events for this SKU (richer,
  // hand-written prose for the headline scenarios), then fill in with generic
  // lines derived straight from the hops for anything authored events don't
  // cover — so the narrative can never contradict what step 6 actually shows. ----
  const events = getEventsBySku(skuId)
    .filter((e) => e.type !== "shortage_detected" && e.type !== "revenue_at_risk")
    .sort((a, b) => a.date.localeCompare(b.date));

  const causalChain: string[] = events.map((e) => (locale === "ko" ? e.descriptionKo : e.description));

  const coveredTypes = new Set(events.map((e) => e.type));

  if (!coveredTypes.has("supplier_delay") && purchaseOrder?.status === "delayed") {
    causalChain.push(
      t(
        `${supplier!.name}의 ${supplier!.material} 공급이 ${purchaseOrder.delayDays}일 지연되었습니다.`,
        `${supplier!.name}'s ${supplier!.material} delivery was delayed ${purchaseOrder.delayDays} ${dayWord(purchaseOrder.delayDays)}.`
      )
    );
  }
  if (!coveredTypes.has("production_delay") && !coveredTypes.has("capacity_exceeded") && productionOrder?.status === "delayed") {
    causalChain.push(
      t(
        `${factoryName}에서 ${sku.name} 생산 오더가 ${productionOrder.delayDays}일 지연되었습니다.`,
        `The ${sku.name} production order at ${factoryName} was delayed ${productionOrder.delayDays} ${dayWord(productionOrder.delayDays)}.`
      )
    );
  } else if (!coveredTypes.has("capacity_exceeded") && factoryStatus?.isOverCapacity) {
    causalChain.push(
      t(
        `${factoryName}가 월 생산 능력의 ${factoryStatus.utilizationPct}%로 가동되어 생산 능력을 초과했습니다.`,
        `${factoryName} is running at ${factoryStatus.utilizationPct}% of its monthly capacity — over capacity.`
      )
    );
  }
  if (!coveredTypes.has("shipment_delay")) {
    if (hubLeg?.status === "delayed") {
      causalChain.push(
        t(
          `공장에서 한국 물류센터로의 배송이 ${hubLeg.delayDays}일 지연되었습니다.`,
          `The shipment from the factory to Korea DC was delayed ${hubLeg.delayDays} ${dayWord(hubLeg.delayDays)}.`
        )
      );
    }
    if (destLeg?.status === "delayed" && row.warehouseId !== "wh-kr") {
      causalChain.push(
        t(
          `한국 물류센터에서 ${warehouseName}로의 배송이 ${destLeg.delayDays}일 지연되었습니다.`,
          `The shipment from Korea DC to ${warehouseName} was delayed ${destLeg.delayDays} ${dayWord(destLeg.delayDays)}.`
        )
      );
    }
  }

  if (causalChain.length === 0) {
    causalChain.push(
      t(
        "특별한 공급망 이슈는 발견되지 않았습니다 — 예상 수요가 당초 재고/생산 계획보다 높습니다.",
        "No specific supply-chain issue was found — projected demand simply exceeds the original inventory/production plan."
      )
    );
  }

  const revenueAtRisk = row.shortageQty * sku.unitPrice;

  if (row.shortageQty > 0) {
    causalChain.push(
      t(
        `결과적으로 ${warehouseName} 가용 재고(${row.availableQty.toLocaleString()}개)가 ${cityName} 콘서트 예상 수요(${row.forecastQty.toLocaleString()}개)에 못 미쳐 ${row.shortageQty.toLocaleString()}개 부족이 예상됩니다.`,
        `As a result, ${warehouseName}'s available inventory (${row.availableQty.toLocaleString()}) falls short of ${cityName}'s forecast demand (${row.forecastQty.toLocaleString()}) — a projected shortage of ${row.shortageQty.toLocaleString()} units.`
      )
    );
    causalChain.push(
      t(
        `이 부족분만으로 예상 매출 약 ₩${Math.round(revenueAtRisk / 1_000_000).toLocaleString()}M이 위험에 노출됩니다.`,
        `This shortage alone puts an estimated ₩${Math.round(revenueAtRisk / 1_000_000).toLocaleString()}M of revenue at risk.`
      )
    );
  }

  const relevantEventIds = getEventsBySku(skuId).map((e) => e.id);

  return { row, hops, causalChain, revenueAtRisk, relevantEventIds };
}

/** SKUs at risk for a given concert — the entry point for the Risk Investigation view. */
export function getAtRiskRowsByConcert(concertId: string): SupplyRiskRow[] {
  return getSupplyRiskRows()
    .filter((r) => r.concertId === concertId && r.riskLevel !== "good")
    .sort((a, b) => b.riskScore - a.riskScore);
}

export interface ConcertRiskSummary {
  concertId: string;
  city: string;
  date: string;
  daysToConcert: number;
  atRiskSkuCount: number;
  totalShortageUnits: number;
  revenueAtRisk: number;
  worstRiskScore: number;
}

/** One row per concert that currently has at-risk SKUs — feeds the dashboard's risk callout(s). */
export function getConcertRiskSummaries(): ConcertRiskSummary[] {
  const rows = getSupplyRiskRows();
  return getConcerts()
    .map((concert) => {
      const concertRows = rows.filter((r) => r.concertId === concert.id && r.riskLevel !== "good");
      if (concertRows.length === 0) return null;
      const totalShortageUnits = concertRows.reduce((sum, r) => sum + r.shortageQty, 0);
      const revenueAtRisk = concertRows.reduce((sum, r) => sum + r.shortageQty * getSkuById(r.skuId)!.unitPrice, 0);
      const worstRiskScore = Math.max(...concertRows.map((r) => r.riskScore));
      return {
        concertId: concert.id,
        city: concert.city,
        date: concert.date,
        daysToConcert: concertRows[0].daysToConcert,
        atRiskSkuCount: concertRows.length,
        totalShortageUnits,
        revenueAtRisk,
        worstRiskScore,
      };
    })
    .filter((s): s is ConcertRiskSummary => s != null)
    .sort((a, b) => b.worstRiskScore - a.worstRiskScore);
}
