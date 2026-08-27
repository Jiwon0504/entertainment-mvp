import { getInventory, getProductionOrders, getShipments, getSkuById, getSkus } from "@/lib/data";
import { getSupplyRiskRows, getWarehouseSurplusRows, SupplyRiskRow } from "./shortagePrediction";

export interface DashboardSummary {
  totalSkus: number;
  totalInventoryUnits: number;
  inventoryAtRiskUnits: number;
  shortageSkuCount: number;
  surplusSkuCount: number;
  unitsInProduction: number;
  unitsInTransit: number;
  delayedProductionCount: number;
  delayedShipmentCount: number;
  projectedRevenue: number;
  revenueAtRisk: number;
  topRiskRows: SupplyRiskRow[];
  riskByCategory: { category: string; riskScore: number }[];
}

export function getDashboardSummary(): DashboardSummary {
  const rows = getSupplyRiskRows();
  const skus = getSkus();
  const inventory = getInventory();
  const productionOrders = getProductionOrders();
  const shipments = getShipments();

  const shortageSkuIds = new Set(rows.filter((r) => r.shortageQty > 0).map((r) => r.skuId));
  // Judge surplus against each DC's combined demand (it may serve more than one
  // concert), not a single show's forecast — otherwise a DC sized for the bigger
  // of two shows always looks "surplus" against the smaller one alone.
  const warehouseSurplusRows = getWarehouseSurplusRows();
  const surplusSkuIds = new Set(
    warehouseSurplusRows
      .filter((r) => r.surplusQty > r.combinedForecastQty * 0.3 && r.surplusQty > 500)
      .map((r) => r.skuId)
  );

  // Inventory lives per (SKU, warehouse) — sum that directly, not per (SKU, concert)
  // rows, since Japan and the US each serve two concerts off one DC and would
  // otherwise double-count that DC's stock.
  const totalInventoryUnits = inventory.reduce((sum, i) => sum + i.quantity, 0);

  // Shortage, by contrast, is inherently per-concert (each show is its own demand
  // event), so summing across rows here is correct.
  const inventoryAtRiskUnits = rows.reduce((sum, r) => sum + r.shortageQty, 0);

  const unitsInProduction = productionOrders
    .filter((p) => p.status !== "completed")
    .reduce((sum, p) => sum + p.quantity, 0);
  const unitsInTransit = shipments.filter((s) => s.status !== "delivered").reduce((sum, s) => sum + s.quantity, 0);
  const delayedProductionCount = productionOrders.filter((p) => p.status === "delayed").length;
  const delayedShipmentCount = shipments.filter((s) => s.status === "delayed").length;

  const projectedRevenue = rows.reduce((sum, r) => {
    const sku = getSkuById(r.skuId)!;
    return sum + r.forecastQty * sku.unitPrice;
  }, 0);
  const revenueAtRisk = rows.reduce((sum, r) => {
    const sku = getSkuById(r.skuId)!;
    return sum + r.shortageQty * sku.unitPrice;
  }, 0);

  const topRiskRows = [...rows].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  const riskByCategory = Array.from(new Set(rows.map((r) => r.productCategory))).map((category) => {
    const categoryRows = rows.filter((r) => r.productCategory === category);
    const riskScore = Math.round(categoryRows.reduce((s, r) => s + r.riskScore, 0) / categoryRows.length);
    return { category, riskScore };
  });

  return {
    totalSkus: skus.length,
    totalInventoryUnits,
    inventoryAtRiskUnits,
    shortageSkuCount: shortageSkuIds.size,
    surplusSkuCount: surplusSkuIds.size,
    unitsInProduction,
    unitsInTransit,
    delayedProductionCount,
    delayedShipmentCount,
    projectedRevenue,
    revenueAtRisk,
    topRiskRows,
    riskByCategory,
  };
}
