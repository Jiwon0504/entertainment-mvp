import { getConcerts, getCountryById, getProducts, getSkus } from "@/lib/data";
import { ProductCategory } from "@/lib/types/entities";

// Mock "LLM" — a rule-based intent/entity parser. No external API call.
// Swapping this for a real LLM later only means replacing parseQuery's body;
// callers only depend on the ParsedQuery shape below.

export type QueryIntent = "INVENTORY_SHORTAGE" | "TOP_RISK" | "ROOT_CAUSE" | "TRANSFER_SIMULATION";

export interface ParsedQuery {
  raw: string;
  intent: QueryIntent;
  concertId?: string;
  concertCity?: string;
  countryId?: string;
  countryName?: string;
  timeHorizonDays?: number;
  skuId?: string;
  productCategory?: ProductCategory;
  transfer?: { fromCountryId: string; toCountryId: string };
  confidence: number;
  usedFallback: boolean;
}

const CITY_KEYWORDS: Record<string, string> = {
  "서울": "concert-seoul",
  seoul: "concert-seoul",
  "도쿄": "concert-tokyo",
  "동경": "concert-tokyo",
  tokyo: "concert-tokyo",
  "로스앤젤레스": "concert-la",
  "엘에이": "concert-la",
  "los angeles": "concert-la",
};

const COUNTRY_KEYWORDS: Record<string, string> = {
  "한국": "country-kr",
  "국내": "country-kr",
  korea: "country-kr",
  "일본": "country-jp",
  japan: "country-jp",
  "미국": "country-us",
  america: "country-us",
  "united states": "country-us",
};

const CATEGORY_KEYWORDS: Record<string, ProductCategory> = {
  "라이트스틱": "Light Stick",
  "응원봉": "Light Stick",
  "light stick": "Light Stick",
  lightstick: "Light Stick",
  "후드": "Hoodie",
  "후디": "Hoodie",
  hoodie: "Hoodie",
  "티셔츠": "T-shirt",
  tshirt: "T-shirt",
  "t-shirt": "T-shirt",
  "포토카드": "Photocard",
  photocard: "Photocard",
  "인형": "Plush Doll",
  "플러시": "Plush Doll",
  plush: "Plush Doll",
};

const VARIANT_KEYWORDS: Record<string, string> = {
  "블랙": "Black",
  black: "Black",
  "화이트": "White",
  white: "White",
  "그레이": "Gray",
  gray: "Gray",
  grey: "Gray",
};

function findConcert(text: string) {
  for (const [kw, concertId] of Object.entries(CITY_KEYWORDS)) {
    if (text.includes(kw)) {
      const concert = getConcerts().find((c) => c.id === concertId);
      if (concert) return { concertId: concert.id, concertCity: concert.city, countryId: concert.countryId };
    }
  }
  return undefined;
}

function findCountries(text: string): { countryId: string; index: number }[] {
  const found: { countryId: string; index: number }[] = [];
  for (const [kw, countryId] of Object.entries(COUNTRY_KEYWORDS)) {
    const idx = text.indexOf(kw);
    if (idx >= 0 && !found.some((f) => f.countryId === countryId)) {
      found.push({ countryId, index: idx });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

function findProduct(text: string): { skuId?: string; productCategory?: ProductCategory } | undefined {
  let category: ProductCategory | undefined;
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (text.includes(kw)) {
      category = cat;
      break;
    }
  }
  if (!category) return undefined;

  let variant: string | undefined;
  for (const [kw, v] of Object.entries(VARIANT_KEYWORDS)) {
    if (text.includes(kw)) {
      variant = v;
      break;
    }
  }

  const product = getProducts().find((p) => p.category === category);
  if (!product) return { productCategory: category };
  const skus = getSkus().filter((s) => s.productId === product.id);
  const matched = variant ? skus.find((s) => s.variant === variant) : skus.length === 1 ? skus[0] : undefined;
  return { skuId: matched?.id, productCategory: category };
}

function findTimeHorizonDays(text: string): number | undefined {
  const weekMatch = text.match(/(\d+)\s*(주|weeks?)/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  const dayMatch = text.match(/(\d+)\s*(일|days?)/);
  if (dayMatch) return parseInt(dayMatch[1], 10);
  const dDashMatch = text.match(/d-?\s*(\d+)/i);
  if (dDashMatch) return parseInt(dDashMatch[1], 10);
  return undefined;
}

export function parseQuery(raw: string, context?: { skuId?: string }): ParsedQuery {
  const text = raw.trim().toLowerCase();

  const concert = findConcert(text);
  const countries = findCountries(text);
  const product = findProduct(text);
  const timeHorizonDays = findTimeHorizonDays(text);

  const hasTransferVerb = /이동|옮기|전환|보내면|transfer|move|moving|shift/.test(text);
  const isWhy = /왜|원인|why|reason/.test(text);
  const isTopRisk = /가장\s*위험|risk[가]?\s*가장|가장\s*심각|top\s*risk|highest[\s\w]{0,20}risk|most\s*at\s*risk/.test(
    text
  );
  const isShortage =
    /부족|모자라|shortage|short(age)?|문제가?\s*될|문제될|run(s|ning)?\s*short|\bproblem/.test(text);

  let intent: QueryIntent;
  let usedFallback = false;

  if (hasTransferVerb && countries.length >= 2) {
    intent = "TRANSFER_SIMULATION";
  } else if (isWhy) {
    intent = "ROOT_CAUSE";
  } else if (isTopRisk) {
    intent = "TOP_RISK";
  } else if (isShortage) {
    intent = "INVENTORY_SHORTAGE";
  } else {
    intent = "TOP_RISK";
    usedFallback = true;
  }

  const skuId = product?.skuId ?? context?.skuId;
  const countryId = concert?.countryId ?? countries[0]?.countryId;
  const entityHits = [concert, countries[0], product, timeHorizonDays].filter(Boolean).length;
  const confidence = usedFallback ? 0.4 : Math.min(0.95, 0.65 + entityHits * 0.1);

  return {
    raw,
    intent,
    concertId: concert?.concertId,
    concertCity: concert?.concertCity,
    countryId,
    countryName: countryId ? getCountryById(countryId)?.name : undefined,
    timeHorizonDays,
    skuId,
    productCategory: product?.productCategory,
    transfer:
      intent === "TRANSFER_SIMULATION" && countries.length >= 2
        ? { fromCountryId: countries[0].countryId, toCountryId: countries[1].countryId }
        : undefined,
    confidence,
    usedFallback,
  };
}
