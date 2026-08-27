import { getFactories, getProductionOrdersByFactory, getSuppliersByFactory, getPurchaseOrdersByFactory } from "@/lib/data";
import { Factory } from "@/lib/types/entities";

export interface FactoryStatus {
  factory: Factory;
  activeQuantity: number; // sum of in_progress + delayed production order quantities
  utilizationPct: number; // activeQuantity / productionCapacityPerMonth, as a percent
  isOverCapacity: boolean;
  delayedOrderCount: number;
  totalOrderCount: number;
  hasSupplierDelay: boolean;
}

/** Utilization and health are computed from live production/purchase orders, never hardcoded. */
export function getFactoryStatus(factoryId: string): FactoryStatus | undefined {
  const factory = getFactories().find((f) => f.id === factoryId);
  if (!factory) return undefined;

  const orders = getProductionOrdersByFactory(factoryId);
  const activeOrders = orders.filter((o) => o.status !== "completed");
  const activeQuantity = activeOrders.reduce((sum, o) => sum + o.quantity, 0);
  const utilizationPct = Math.round((activeQuantity / factory.productionCapacityPerMonth) * 100);
  const delayedOrderCount = orders.filter((o) => o.status === "delayed").length;

  const purchaseOrders = getPurchaseOrdersByFactory(factoryId);
  const hasSupplierDelay = purchaseOrders.some((po) => po.status === "delayed");

  return {
    factory,
    activeQuantity,
    utilizationPct,
    isOverCapacity: utilizationPct > 100,
    delayedOrderCount,
    totalOrderCount: orders.length,
    hasSupplierDelay,
  };
}

export function getAllFactoryStatuses(): FactoryStatus[] {
  return getFactories()
    .map((f) => getFactoryStatus(f.id))
    .filter((s): s is FactoryStatus => s != null);
}

export function getPrimarySupplier(factoryId: string) {
  return getSuppliersByFactory(factoryId)[0];
}
