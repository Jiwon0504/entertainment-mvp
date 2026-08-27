import {
  getConcertById,
  getConcerts,
  getDemandForecasts,
  getInventory,
  getProductById,
  getProductionOrdersBySku,
  getReferenceDate,
  getShipmentsBySku,
  getSkuById,
  getWarehouseById,
} from "@/lib/data";
import { daysBetween } from "@/lib/mock/random";
import { Locale } from "@/lib/i18n/dictionary";
import { localizeCity, localizeWarehouse } from "@/lib/i18n/domain";

export type RiskLevel = "good" | "warning" | "serious" | "critical";

export interface SupplyRiskRow {
  skuId: string;
  skuName: string;
  productCategory: string;
  warehouseId: string;
  warehouseName: string;
  concertId: string;
  concertCity: string;
  concertDate: string;
  daysToConcert: number;
  inventoryQty: number;
  reservedQty: number;
  availableQty: number;
  safetyStock: number;
  forecastQty: number;
  shortageQty: number; // > 0 when forecast exceeds inventory
  surplusQty: number; // > 0 when inventory exceeds forecast + safety stock
  productionLeadTimeDays: number;
  incomingProductionQty: number;
  incomingShipmentQty: number;
  hasDelayedProduction: boolean;
  hasDelayedShipment: boolean;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
}

function computeRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 40) return "serious";
  if (score >= 15) return "warning";
  return "good";
}

/** Each concert country maps 1:1 to the DC that serves it (Japan and the US each run two shows off one DC). */
export function warehouseIdForCountry(countryId: string): string {
  return countryId === "country-kr" ? "wh-kr" : countryId === "country-jp" ? "wh-jp" : "wh-us";
}

export function getSupplyRiskRows(): SupplyRiskRow[] {
  const referenceDate = getReferenceDate();
  const forecasts = getDemandForecasts();
  const inventory = getInventory();

  return forecasts.map((forecast) => {
    const sku = getSkuById(forecast.skuId)!;
    const product = getProductById(sku.productId)!;
    const concert = getConcertById(forecast.concertId)!;
    const warehouseId = warehouseIdForCountry(concert.countryId);
    const warehouse = getWarehouseById(warehouseId)!;
    const inv = inventory.find((i) => i.skuId === sku.id && i.warehouseId === warehouseId);
    const inventoryQty = inv?.quantity ?? 0;
    const reservedQty = inv?.reserved ?? 0;
    const safetyStock = inv?.safetyStock ?? 0;
    const availableQty = Math.max(0, inventoryQty - reservedQty);

    const shortageQty = Math.max(0, forecast.forecastQuantity - availableQty);
    const surplusQty = Math.max(0, availableQty - forecast.forecastQuantity - safetyStock);
    const daysToConcert = daysBetween(referenceDate, concert.date);

    const productionOrders = getProductionOrdersBySku(sku.id);
    const shipments = getShipmentsBySku(sku.id).filter((s) => s.toWarehouseId === warehouseId);
    const incomingProductionQty = productionOrders
      .filter((p) => p.status !== "completed")
      .reduce((sum, p) => sum + p.quantity, 0);
    const incomingShipmentQty = shipments
      .filter((s) => s.status !== "delivered")
      .reduce((sum, s) => sum + s.quantity, 0);
    const hasDelayedProduction = productionOrders.some((p) => p.status === "delayed");
    const hasDelayedShipment = shipments.some((s) => s.status === "delayed");

    const shortageRatio = forecast.forecastQuantity > 0 ? shortageQty / forecast.forecastQuantity : 0;
    const leadTimeFeasibility =
      product.productionLeadTimeDays > daysToConcert
        ? 40
        : (product.productionLeadTimeDays / Math.max(daysToConcert, 1)) * 20;
    const delayPenalty = (hasDelayedProduction ? 10 : 0) + (hasDelayedShipment ? 10 : 0);
    // Lead-time feasibility and delay penalties only matter once there's an actual
    // shortfall to resolve — a surplus SKU with a long lead time isn't "at risk".
    const riskScore =
      shortageQty > 0 ? Math.min(100, Math.round(shortageRatio * 60 + leadTimeFeasibility + delayPenalty)) : 0;

    return {
      skuId: sku.id,
      skuName: sku.name,
      productCategory: product.category,
      warehouseId,
      warehouseName: warehouse.name,
      concertId: concert.id,
      concertCity: concert.city,
      concertDate: concert.date,
      daysToConcert,
      inventoryQty,
      reservedQty,
      availableQty,
      safetyStock,
      forecastQty: forecast.forecastQuantity,
      shortageQty,
      surplusQty,
      productionLeadTimeDays: product.productionLeadTimeDays,
      incomingProductionQty,
      incomingShipmentQty,
      hasDelayedProduction,
      hasDelayedShipment,
      riskScore,
      riskLevel: computeRiskLevel(riskScore),
    };
  });
}

export function getSupplyRiskRowsBySku(skuId: string): SupplyRiskRow[] {
  return getSupplyRiskRows().filter((r) => r.skuId === skuId);
}

export function getSupplyRiskRowsByConcert(concertId: string): SupplyRiskRow[] {
  return getSupplyRiskRows().filter((r) => r.concertId === concertId);
}

/** Plain-language explanation for a single shortage row, used by the Shortage Prediction view. */
export function explainShortage(row: SupplyRiskRow, locale: Locale = "ko"): string[] {
  const city = localizeCity(row.concertCity, locale);
  const warehouse = localizeWarehouse(row.warehouseName, locale);
  const lines: string[] = [];

  if (row.shortageQty <= 0) {
    lines.push(
      locale === "ko"
        ? `${warehouse}의 가용 재고는 현재 ${city} 콘서트 예상 수요를 충족하고 있습니다.`
        : `${warehouse}'s available inventory currently covers projected demand for the ${city} show.`
    );
    return lines;
  }

  lines.push(
    locale === "ko"
      ? `${city} 콘서트까지 ${row.daysToConcert}일 남았습니다. ${warehouse} 가용 재고는 ${row.availableQty.toLocaleString()}개(보유 ${row.inventoryQty.toLocaleString()}개 중 ${row.reservedQty.toLocaleString()}개 예약분 제외)이며 예상 수요는 ${row.forecastQty.toLocaleString()}개로, ${row.shortageQty.toLocaleString()}개 부족이 예상됩니다.`
      : `${city} show is ${row.daysToConcert} days away. ${warehouse} has ${row.availableQty.toLocaleString()} units available (${row.inventoryQty.toLocaleString()} on hand minus ${row.reservedQty.toLocaleString()} reserved) against a forecast of ${row.forecastQty.toLocaleString()} — a projected shortage of ${row.shortageQty.toLocaleString()} units.`
  );

  if (row.productionLeadTimeDays > row.daysToConcert) {
    lines.push(
      locale === "ko"
        ? `생산 리드타임은 ${row.productionLeadTimeDays}일로, 남은 기간(${row.daysToConcert}일)보다 길어 추가 생산만으로는 제때 대응하기 어렵습니다.`
        : `Production lead time is ${row.productionLeadTimeDays} days, longer than the ${row.daysToConcert} days remaining — a new production run alone cannot land in time.`
    );
  } else {
    lines.push(
      locale === "ko"
        ? `생산 리드타임은 ${row.productionLeadTimeDays}일로 남은 기간(${row.daysToConcert}일) 안에는 들어오지만, 배송까지 고려하면 여유가 많지 않습니다.`
        : `Production lead time is ${row.productionLeadTimeDays} days, within the ${row.daysToConcert}-day window, but still leaves little buffer for shipping.`
    );
  }

  if (row.hasDelayedProduction) {
    lines.push(
      locale === "ko"
        ? "이 SKU의 기존 생산 오더가 이미 일정보다 지연되고 있습니다."
        : "An existing production order for this SKU is already running behind schedule."
    );
  }
  if (row.hasDelayedShipment) {
    lines.push(
      locale === "ko"
        ? "이 물류센터로 향하는 입고 배송이 지연되어 일정이 더 촉박해지고 있습니다."
        : "An inbound shipment to this warehouse is delayed, tightening the timeline further."
    );
  }

  return lines;
}

export function getConcertCountdown() {
  const referenceDate = getReferenceDate();
  return getConcerts()
    .map((c) => ({ ...c, daysToConcert: daysBetween(referenceDate, c.date) }))
    .sort((a, b) => a.daysToConcert - b.daysToConcert);
}

export interface WarehouseSurplusRow {
  skuId: string;
  warehouseId: string;
  availableQty: number;
  combinedForecastQty: number; // demand summed across every concert that DC serves
  safetyStock: number;
  surplusQty: number;
}

/**
 * Surplus judged against a single concert's demand overstates it whenever a DC
 * serves more than one show (Japan: Tokyo + Osaka; US: LA + NY) — a DC sized for
 * the bigger show will always look "surplus" against the smaller one alone. This
 * compares available inventory to the combined demand of every concert the DC
 * actually has to cover, which is the correct basis for an overstock signal.
 */
export function getWarehouseSurplusRows(): WarehouseSurplusRow[] {
  const inventory = getInventory();
  const forecasts = getDemandForecasts();
  const concerts = getConcerts();

  const combinedForecast = new Map<string, number>();
  for (const f of forecasts) {
    const concert = concerts.find((c) => c.id === f.concertId);
    if (!concert) continue;
    const key = `${f.skuId}|${warehouseIdForCountry(concert.countryId)}`;
    combinedForecast.set(key, (combinedForecast.get(key) ?? 0) + f.forecastQuantity);
  }

  return inventory.map((inv) => {
    const key = `${inv.skuId}|${inv.warehouseId}`;
    const availableQty = Math.max(0, inv.quantity - inv.reserved);
    const combinedForecastQty = combinedForecast.get(key) ?? 0;
    const surplusQty = Math.max(0, availableQty - combinedForecastQty - inv.safetyStock);
    return { skuId: inv.skuId, warehouseId: inv.warehouseId, availableQty, combinedForecastQty, safetyStock: inv.safetyStock, surplusQty };
  });
}
