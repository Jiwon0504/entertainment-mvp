import { Locale } from "./dictionary";

// Localized display names for fixed domain proper nouns (cities, countries,
// warehouses, factories, product categories). SKU/product names themselves
// are treated as fixed catalog names and are not translated.

const CONCERT_CITY: Record<string, { ko: string; en: string }> = {
  Seoul: { ko: "서울", en: "Seoul" },
  Tokyo: { ko: "도쿄", en: "Tokyo" },
  Osaka: { ko: "오사카", en: "Osaka" },
  "Los Angeles": { ko: "로스앤젤레스", en: "Los Angeles" },
  "New York": { ko: "뉴욕", en: "New York" },
};

const COUNTRY_NAME: Record<string, { ko: string; en: string }> = {
  "South Korea": { ko: "한국", en: "South Korea" },
  Japan: { ko: "일본", en: "Japan" },
  "United States": { ko: "미국", en: "United States" },
  China: { ko: "중국", en: "China" },
  Vietnam: { ko: "베트남", en: "Vietnam" },
};

const WAREHOUSE_NAME: Record<string, { ko: string; en: string }> = {
  "Korea Distribution Center": { ko: "한국 물류센터", en: "Korea Distribution Center" },
  "Japan Distribution Center": { ko: "일본 물류센터", en: "Japan Distribution Center" },
  "US Distribution Center": { ko: "미국 물류센터", en: "US Distribution Center" },
};

const FACTORY_NAME: Record<string, { ko: string; en: string }> = {
  "Factory A (Incheon, Korea)": { ko: "A 공장 (인천, 한국)", en: "Factory A (Incheon, Korea)" },
  "Factory B (Shenzhen, China)": { ko: "B 공장 (선전, 중국)", en: "Factory B (Shenzhen, China)" },
  "Factory C (Ho Chi Minh, Vietnam)": { ko: "C 공장 (호치민, 베트남)", en: "Factory C (Ho Chi Minh, Vietnam)" },
  "Factory D (Guangzhou, China)": { ko: "D 공장 (광저우, 중국)", en: "Factory D (Guangzhou, China)" },
};

const PRODUCT_CATEGORY: Record<string, { ko: string; en: string }> = {
  "Plush Doll": { ko: "플러시 인형", en: "Plush Doll" },
  "T-shirt": { ko: "티셔츠", en: "T-shirt" },
  Photocard: { ko: "포토카드", en: "Photocard" },
  "Photocard Set": { ko: "포토카드 세트", en: "Photocard Set" },
  "Light Stick": { ko: "라이트스틱", en: "Light Stick" },
  Hoodie: { ko: "후드", en: "Hoodie" },
  Cap: { ko: "캡", en: "Cap" },
  "Acrylic Stand": { ko: "아크릴 스탠드", en: "Acrylic Stand" },
  Keyring: { ko: "키링", en: "Keyring" },
  "Tote Bag": { ko: "토트백", en: "Tote Bag" },
  Poster: { ko: "포스터", en: "Poster" },
  Blanket: { ko: "블랑켓", en: "Blanket" },
  Slogan: { ko: "슬로건", en: "Slogan" },
};

function lookup(map: Record<string, { ko: string; en: string }>, key: string, locale: Locale): string {
  return map[key]?.[locale] ?? key;
}

export const localizeCity = (city: string, locale: Locale) => lookup(CONCERT_CITY, city, locale);
export const localizeCountry = (name: string, locale: Locale) => lookup(COUNTRY_NAME, name, locale);
export const localizeWarehouse = (name: string, locale: Locale) => lookup(WAREHOUSE_NAME, name, locale);
export const localizeFactory = (name: string, locale: Locale) => lookup(FACTORY_NAME, name, locale);
export const localizeCategory = (category: string, locale: Locale) => lookup(PRODUCT_CATEGORY, category, locale);
