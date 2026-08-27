export type CountryCode = "KR" | "JP" | "US" | "CN" | "VN";

export interface Country {
  id: string;
  code: CountryCode;
  name: string;
}

export interface Artist {
  id: string;
  name: string;
}

export type ProductCategory =
  | "Plush Doll"
  | "T-shirt"
  | "Photocard"
  | "Photocard Set"
  | "Light Stick"
  | "Hoodie"
  | "Cap"
  | "Acrylic Stand"
  | "Keyring"
  | "Tote Bag"
  | "Poster"
  | "Blanket"
  | "Slogan";

export interface Product {
  id: string;
  artistId: string;
  name: string;
  category: ProductCategory;
  productionLeadTimeDays: number;
}

export interface Sku {
  id: string;
  productId: string;
  name: string;
  variant: string;
  unitPrice: number; // KRW
  productionCost: number; // KRW
  factoryId: string;
  minimumOrderQuantity: number;
}

export interface Factory {
  id: string;
  name: string;
  countryId: string;
  productionCapacityPerMonth: number; // units/month, across all SKUs it produces
  qualityIssueNote?: string;
}

export type ProductionOrderStatus = "in_progress" | "completed" | "delayed";

export interface ProductionOrder {
  id: string;
  skuId: string;
  factoryId: string;
  quantity: number;
  orderDate: string; // ISO date
  expectedCompletionDate: string; // ISO date
  status: ProductionOrderStatus;
  delayDays: number;
}

export interface Warehouse {
  id: string;
  name: string;
  countryId: string;
  type: "distribution_center";
}

export interface Inventory {
  skuId: string;
  warehouseId: string;
  quantity: number; // on-hand
  reserved: number; // already committed/allocated, not available for new demand
  safetyStock: number;
}

export type ShipmentStatus = "in_transit" | "delivered" | "delayed";

export interface Shipment {
  id: string;
  skuId: string;
  fromId: string; // factoryId or warehouseId
  fromType: "factory" | "warehouse";
  toWarehouseId: string;
  quantity: number;
  departureDate: string;
  expectedArrival: string; // on-time promise: departure + lead time
  actualArrival: string; // delivered: real arrival date; otherwise current projected arrival (includes delay)
  leadTimeDays: number;
  status: ShipmentStatus;
  delayDays: number;
}

export type SalesChannelType = "online" | "concert_venue";

export interface SalesChannel {
  id: string;
  name: string;
  type: SalesChannelType;
  countryId: string;
  concertId?: string;
}

export interface Concert {
  id: string;
  artistId: string;
  city: string;
  countryId: string;
  venue: string;
  date: string; // ISO date
  expectedAttendance: number;
}

export interface DailySales {
  date: string; // ISO date
  quantity: number;
}

export interface DemandForecast {
  skuId: string;
  concertId: string;
  forecastQuantity: number;
  dailySales: DailySales[];
}

export interface Supplier {
  id: string;
  name: string;
  material: string;
  countryId: string;
  factoryId: string; // primary factory served
}

export type PurchaseOrderStatus = "ordered" | "in_transit" | "delivered" | "delayed";

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  factoryId: string;
  material: string;
  quantity: number;
  unit: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: PurchaseOrderStatus;
  delayDays: number;
}

export interface SupplyChainEvent {
  id: string;
  type:
    | "supplier_delay"
    | "production_delay"
    | "shipment_delay"
    | "shortage_detected"
    | "demand_spike"
    | "capacity_exceeded"
    | "revenue_at_risk";
  relatedSkuId?: string;
  relatedEntityId?: string;
  date: string;
  description: string;
  descriptionKo: string;
}

export interface MockDatabase {
  countries: Country[];
  artists: Artist[];
  products: Product[];
  skus: Sku[];
  factories: Factory[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  productionOrders: ProductionOrder[];
  warehouses: Warehouse[];
  inventory: Inventory[];
  shipments: Shipment[];
  salesChannels: SalesChannel[];
  concerts: Concert[];
  demandForecasts: DemandForecast[];
  events: SupplyChainEvent[];
  referenceDate: string; // ISO date — "today" for the demo
}
