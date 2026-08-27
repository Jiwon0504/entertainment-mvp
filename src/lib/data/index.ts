import { getMockDatabase } from "@/lib/mock/seed";
import {
  Concert,
  Country,
  DemandForecast,
  Factory,
  Inventory,
  Product,
  ProductionOrder,
  PurchaseOrder,
  Shipment,
  Sku,
  Supplier,
  SupplyChainEvent,
  Warehouse,
} from "@/lib/types/entities";

// Repository layer: the only place that reads the underlying data source.
// Today it reads the in-memory mock DB; swapping to a real DB/API later
// only requires changing the implementations below, not the callers.

export function getReferenceDate(): string {
  return getMockDatabase().referenceDate;
}

export function getCountries(): Country[] {
  return getMockDatabase().countries;
}

export function getCountryById(id: string): Country | undefined {
  return getCountries().find((c) => c.id === id);
}

export function getProducts(): Product[] {
  return getMockDatabase().products;
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function getSkus(): Sku[] {
  return getMockDatabase().skus;
}

export function getSkuById(id: string): Sku | undefined {
  return getSkus().find((s) => s.id === id);
}

export function getFactories(): Factory[] {
  return getMockDatabase().factories;
}

export function getFactoryById(id: string): Factory | undefined {
  return getFactories().find((f) => f.id === id);
}

export function getWarehouses(): Warehouse[] {
  return getMockDatabase().warehouses;
}

export function getWarehouseById(id: string): Warehouse | undefined {
  return getWarehouses().find((w) => w.id === id);
}

export function getConcerts(): Concert[] {
  return getMockDatabase().concerts;
}

export function getConcertById(id: string): Concert | undefined {
  return getConcerts().find((c) => c.id === id);
}

export function getInventory(): Inventory[] {
  return getMockDatabase().inventory;
}

export function getInventoryBySku(skuId: string): Inventory[] {
  return getInventory().filter((i) => i.skuId === skuId);
}

export function getProductionOrders(): ProductionOrder[] {
  return getMockDatabase().productionOrders;
}

export function getProductionOrdersBySku(skuId: string): ProductionOrder[] {
  return getProductionOrders().filter((p) => p.skuId === skuId);
}

export function getShipments(): Shipment[] {
  return getMockDatabase().shipments;
}

export function getShipmentsBySku(skuId: string): Shipment[] {
  return getShipments().filter((s) => s.skuId === skuId);
}

export function getDemandForecasts(): DemandForecast[] {
  return getMockDatabase().demandForecasts;
}

export function getDemandForecastsBySku(skuId: string): DemandForecast[] {
  return getDemandForecasts().filter((d) => d.skuId === skuId);
}

export function getDemandForecast(skuId: string, concertId: string): DemandForecast | undefined {
  return getDemandForecasts().find((d) => d.skuId === skuId && d.concertId === concertId);
}

export function getEvents(): SupplyChainEvent[] {
  return getMockDatabase().events;
}

export function getEventsBySku(skuId: string): SupplyChainEvent[] {
  return getEvents().filter((e) => e.relatedSkuId === skuId);
}

export function getEventsByEntity(entityId: string): SupplyChainEvent[] {
  return getEvents().filter((e) => e.relatedEntityId === entityId);
}

export function getSuppliers(): Supplier[] {
  return getMockDatabase().suppliers;
}

export function getSupplierById(id: string): Supplier | undefined {
  return getSuppliers().find((s) => s.id === id);
}

export function getSuppliersByFactory(factoryId: string): Supplier[] {
  return getSuppliers().filter((s) => s.factoryId === factoryId);
}

export function getPurchaseOrders(): PurchaseOrder[] {
  return getMockDatabase().purchaseOrders;
}

export function getPurchaseOrdersByFactory(factoryId: string): PurchaseOrder[] {
  return getPurchaseOrders().filter((p) => p.factoryId === factoryId);
}

export function getPurchaseOrdersBySupplier(supplierId: string): PurchaseOrder[] {
  return getPurchaseOrders().filter((p) => p.supplierId === supplierId);
}

export function getProductionOrdersByFactory(factoryId: string): ProductionOrder[] {
  return getProductionOrders().filter((p) => p.factoryId === factoryId);
}

export function getShipmentsByFactory(factoryId: string): Shipment[] {
  return getShipments().filter((s) => s.fromType === "factory" && s.fromId === factoryId);
}
