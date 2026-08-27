import { getCountryById } from "@/lib/data";
import { getSupplyRiskRows } from "./shortagePrediction";

// Cross-DC transfer lead times (days). Estimates for direct DC-to-DC moves —
// today's shipping lanes route production through Korea, so a direct
// non-Korea leg (e.g. US -> Japan) is a simplification for what-if purposes.
const CROSS_DC_LEAD_TIME: Record<string, number> = {
  "wh-jp|wh-kr": 5,
  "wh-kr|wh-us": 10,
  "wh-jp|wh-us": 12,
};

const COUNTRY_TO_WAREHOUSE: Record<string, string> = {
  "country-kr": "wh-kr",
  "country-jp": "wh-jp",
  "country-us": "wh-us",
};

export interface TransferSimulationResult {
  skuId: string;
  skuName: string;
  fromWarehouseId: string;
  fromCountryName: string;
  toWarehouseId: string;
  toCountryName: string;
  availableSurplus: number;
  shortageBefore: number;
  transferQty: number;
  shortageAfter: number;
  leadTimeDays: number;
  daysToConcert: number;
  arrivesInTime: boolean;
  resolvesShortage: boolean;
}

/**
 * Estimates the effect of moving surplus stock from one country's DC to
 * another's, targeting whichever SKU has the worst shortage at the
 * destination (or a specific SKU, if given). This is a lightweight
 * preview of the future What-if Simulation feature, not the full page.
 */
export function simulateTransfer(
  fromCountryId: string,
  toCountryId: string,
  skuId?: string
): TransferSimulationResult | null {
  const fromWarehouseId = COUNTRY_TO_WAREHOUSE[fromCountryId];
  const toWarehouseId = COUNTRY_TO_WAREHOUSE[toCountryId];
  if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) return null;

  const rows = getSupplyRiskRows();
  const destCandidates = rows
    .filter((r) => r.warehouseId === toWarehouseId && r.shortageQty > 0 && (!skuId || r.skuId === skuId))
    .sort((a, b) => b.shortageQty - a.shortageQty);
  const target = destCandidates[0];
  if (!target) return null;

  const sourceRow = rows.find((r) => r.warehouseId === fromWarehouseId && r.skuId === target.skuId);
  const availableSurplus = sourceRow?.surplusQty ?? 0;
  const transferQty = Math.min(availableSurplus, target.shortageQty);
  const shortageAfter = target.shortageQty - transferQty;
  const leadTimeDays = CROSS_DC_LEAD_TIME[[fromWarehouseId, toWarehouseId].sort().join("|")] ?? 10;

  return {
    skuId: target.skuId,
    skuName: target.skuName,
    fromWarehouseId,
    fromCountryName: getCountryById(fromCountryId)?.name ?? fromCountryId,
    toWarehouseId,
    toCountryName: getCountryById(toCountryId)?.name ?? toCountryId,
    availableSurplus,
    shortageBefore: target.shortageQty,
    transferQty,
    shortageAfter,
    leadTimeDays,
    daysToConcert: target.daysToConcert,
    arrivesInTime: leadTimeDays <= target.daysToConcert,
    resolvesShortage: shortageAfter === 0,
  };
}
