import { getEventsBySku, getWarehouseById } from "@/lib/data";
import { explainShortage, getSupplyRiskRows, SupplyRiskRow } from "@/lib/engine/shortagePrediction";
import { simulateTransfer, TransferSimulationResult } from "@/lib/engine/simulation";
import { Locale } from "@/lib/i18n/dictionary";
import { localizeCountry } from "@/lib/i18n/domain";
import { parseQuery, ParsedQuery } from "./parser";

export interface AssistantAnswer {
  parsed: ParsedQuery;
  resultRows: SupplyRiskRow[];
  simulation?: TransferSimulationResult | null;
  explanation: string[];
}

function filterByParsed(rows: SupplyRiskRow[], parsed: ParsedQuery): SupplyRiskRow[] {
  let out = rows;
  if (parsed.concertId) out = out.filter((r) => r.concertId === parsed.concertId);
  else if (parsed.countryId) out = out.filter((r) => getWarehouseById(r.warehouseId)?.countryId === parsed.countryId);
  if (parsed.productCategory) out = out.filter((r) => r.productCategory === parsed.productCategory);
  if (parsed.skuId) out = out.filter((r) => r.skuId === parsed.skuId);
  return out;
}

function eventText(skuId: string, locale: Locale): string[] {
  return getEventsBySku(skuId).map((e) => (locale === "ko" ? e.descriptionKo : e.description));
}

export function answerQuery(raw: string, context?: { skuId?: string }, locale: Locale = "ko"): AssistantAnswer {
  const parsed = parseQuery(raw, context);
  const allRows = getSupplyRiskRows();

  if (parsed.intent === "TRANSFER_SIMULATION" && parsed.transfer) {
    const sim = simulateTransfer(parsed.transfer.fromCountryId, parsed.transfer.toCountryId, parsed.skuId);
    if (!sim) {
      return {
        parsed,
        resultRows: [],
        explanation: [
          locale === "ko"
            ? "이동 대상 지역에는 현재 부족 상태인 SKU가 없어 재고 이동이 필요하지 않습니다."
            : "There's no SKU currently short at the destination, so no transfer is needed.",
        ],
      };
    }
    const relatedRow = allRows.find((r) => r.skuId === sim.skuId && r.warehouseId === sim.toWarehouseId);
    const fromName = localizeCountry(sim.fromCountryName, locale);
    const toName = localizeCountry(sim.toCountryName, locale);
    const explanation =
      locale === "ko"
        ? [
            `${fromName} 창고에는 ${sim.skuName}의 여유 재고가 ${sim.availableSurplus.toLocaleString()}개 있습니다.`,
            `이를 ${toName}로 이동하면 예상 리드타임은 약 ${sim.leadTimeDays}일이며, 부족분 중 ${sim.transferQty.toLocaleString()}개를 충당할 수 있습니다.`,
            sim.resolvesShortage
              ? "이동만으로 부족분이 모두 해소됩니다."
              : `이동 후에도 ${sim.shortageAfter.toLocaleString()}개가 부족한 상태로 남아, 추가 생산이나 다른 대응이 함께 필요합니다.`,
            sim.arrivesInTime
              ? `콘서트까지 ${sim.daysToConcert}일 남아 있어 이동 리드타임(${sim.leadTimeDays}일) 안에 도착할 수 있습니다.`
              : `콘서트까지 ${sim.daysToConcert}일 남았는데 이동 리드타임이 ${sim.leadTimeDays}일이라 제때 도착하지 못할 위험이 있습니다.`,
          ]
        : [
            `${fromName} warehouse has ${sim.availableSurplus.toLocaleString()} surplus units of ${sim.skuName}.`,
            `Moving it to ${toName} takes an estimated ${sim.leadTimeDays} days and can cover ${sim.transferQty.toLocaleString()} units of the shortage.`,
            sim.resolvesShortage
              ? "The transfer alone fully resolves the shortage."
              : `Even after the transfer, ${sim.shortageAfter.toLocaleString()} units remain short — additional production or another response is still needed.`,
            sim.arrivesInTime
              ? `${sim.daysToConcert} days remain until the concert, so the ${sim.leadTimeDays}-day transfer can arrive in time.`
              : `Only ${sim.daysToConcert} days remain until the concert, but the transfer takes ${sim.leadTimeDays} days — it risks arriving too late.`,
          ];
    return { parsed, resultRows: relatedRow ? [relatedRow] : [], simulation: sim, explanation };
  }

  if (parsed.intent === "ROOT_CAUSE") {
    let targetSkuId = parsed.skuId;
    const notes: string[] = [];
    if (!targetSkuId) {
      const worst = [...allRows].sort((a, b) => b.riskScore - a.riskScore)[0];
      targetSkuId = worst?.skuId;
      if (worst) {
        notes.push(
          locale === "ko"
            ? `구체적인 상품을 지정하지 않으셔서, 현재 위험도가 가장 높은 "${worst.skuName}" 기준으로 답변합니다.`
            : `No specific product was named, so this answer is based on the current highest-risk SKU, "${worst.skuName}".`
        );
      }
    }
    const rows = allRows.filter((r) => r.skuId === targetSkuId).sort((a, b) => b.riskScore - a.riskScore);
    const worstRow = rows[0];
    if (!worstRow) {
      return {
        parsed,
        resultRows: [],
        explanation: [locale === "ko" ? "해당 상품 정보를 찾을 수 없습니다." : "Could not find that product."],
      };
    }
    const events = eventText(targetSkuId!, locale);
    return { parsed, resultRows: rows, explanation: [...notes, ...explainShortage(worstRow, locale), ...events] };
  }

  if (parsed.intent === "TOP_RISK") {
    const rows = filterByParsed(allRows, parsed)
      .slice()
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
    const top = rows[0];
    const explanation = top
      ? [
          locale === "ko"
            ? `현재 가장 위험도가 높은 SKU는 "${top.skuName}"입니다 (리스크 점수 ${top.riskScore}/100, ${top.concertCity} 콘서트 기준, D-${top.daysToConcert}).`
            : `The highest-risk SKU right now is "${top.skuName}" (risk score ${top.riskScore}/100, based on the ${top.concertCity} concert, D-${top.daysToConcert}).`,
          ...explainShortage(top, locale),
        ]
      : [locale === "ko" ? "현재 위험으로 분류된 SKU가 없습니다." : "No SKU is currently classified as at risk."];
    return { parsed, resultRows: rows, explanation };
  }

  // INVENTORY_SHORTAGE (default)
  const rows = filterByParsed(allRows, parsed)
    .filter((r) => r.shortageQty > 0)
    .slice()
    .sort((a, b) => b.shortageQty - a.shortageQty)
    .slice(0, 5);

  if (rows.length === 0) {
    return {
      parsed,
      resultRows: [],
      explanation: [
        locale === "ko"
          ? "조건에 맞는 부족 예상 상품이 없습니다. 현재 재고가 예상 수요를 충족하고 있습니다."
          : "No products match this shortage query — current inventory covers projected demand.",
      ],
    };
  }

  const explanation = explainShortage(rows[0], locale);
  if (rows.length > 1) {
    explanation.push(
      locale === "ko"
        ? `그 외 ${rows.length - 1}개 SKU에서도 부족이 예상됩니다.`
        : `${rows.length - 1} other SKU(s) are also projected to fall short.`
    );
  }
  return { parsed, resultRows: rows, explanation };
}
