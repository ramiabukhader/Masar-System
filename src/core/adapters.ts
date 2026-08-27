import type { Customer, InventoryRecord, Node, Order, Product } from './types';

/**
 * The entire integration surface with Maslamani Home's commerce database.
 *
 * Deliberately narrow (docs/03 §1): we read orders, customers, products, inventory and
 * branches; we write back exactly one thing — delivery status. Their system stays the
 * source of truth for commerce, ours for delivery, and the blast radius stays near zero.
 */
export interface OrderSource {
  fetchPendingOrders(horizon: { from: Date; to: Date }): Promise<Order[]>;
  fetchCustomers(ids: string[]): Promise<Customer[]>;
  fetchProducts(skus: string[]): Promise<Product[]>;
  fetchBranches(): Promise<Node[]>;
  fetchInventory(skus: string[]): Promise<InventoryRecord[]>;
  writeDeliveryStatus(update: DeliveryStatusUpdate): Promise<void>;
}

export interface DeliveryStatusUpdate {
  orderId: string;
  status: 'planned' | 'out_for_delivery' | 'delivered' | 'partial' | 'failed' | 'returned';
  occurredAt: Date;
  podReference?: string;
  exceptionCode?: string;
  note?: string;
}

/**
 * Demo implementation. Everything in this repository runs on it, which means the demo
 * exercises exactly the same planning, dispatch and driver code that production will —
 * only the adapter changes.
 */
export class MockOrderSource implements OrderSource {
  private readonly statusLog: DeliveryStatusUpdate[] = [];

  constructor(
    private readonly data: {
      orders: Order[];
      customers: Customer[];
      products: Product[];
      branches: Node[];
      inventory: InventoryRecord[];
    },
  ) {}

  async fetchPendingOrders(horizon: { from: Date; to: Date }): Promise<Order[]> {
    return this.data.orders.filter(
      (order) => order.dueAt >= horizon.from && order.dueAt <= horizon.to,
    );
  }

  async fetchCustomers(ids: string[]): Promise<Customer[]> {
    const wanted = new Set(ids);
    return this.data.customers.filter((customer) => wanted.has(customer.id));
  }

  async fetchProducts(skus: string[]): Promise<Product[]> {
    const wanted = new Set(skus);
    return this.data.products.filter((product) => wanted.has(product.sku));
  }

  async fetchBranches(): Promise<Node[]> {
    return this.data.branches;
  }

  async fetchInventory(skus: string[]): Promise<InventoryRecord[]> {
    const wanted = new Set(skus);
    return this.data.inventory.filter((record) => wanted.has(record.sku));
  }

  async writeDeliveryStatus(update: DeliveryStatusUpdate): Promise<void> {
    this.statusLog.push(update);
  }

  /** Demo-only: inspect what would have been written back to their database. */
  get writtenStatuses(): readonly DeliveryStatusUpdate[] {
    return this.statusLog;
  }
}

/**
 * Production adapter — the SQL each method needs, so the integration is a fill-in rather
 * than a design exercise once discovery confirms the real table and column names.
 *
 * Two rules this adapter must never break:
 *   1. Every read goes to a READ-REPLICA with read-only credentials.
 *   2. The only write is an INSERT into `masar_delivery_status` (see docs/04 §3).
 *      No UPDATE, no DELETE, no schema change to any existing table.
 *
 * ```sql
 * -- fetchPendingOrders
 * SELECT o.order_id, o.customer_id, o.channel, o.branch_id, o.confirmed_at,
 *        o.payment_type, o.amount_due, o.instalment_cleared
 *   FROM orders o
 *   LEFT JOIN masar_delivery_status s ON s.order_id = o.order_id AND s.status = 'delivered'
 *  WHERE o.confirmed_at IS NOT NULL
 *    AND s.order_id IS NULL
 *    AND o.confirmed_at BETWEEN :from - INTERVAL '48 hours' AND :to;
 *
 * -- fetchProducts: the dimension columns are the ones to verify first (docs/04 §4)
 * SELECT p.sku, p.name_ar, p.name_en, p.brand, p.category,
 *        p.length_cm, p.width_cm, p.height_cm, p.weight_kg
 *   FROM products p WHERE p.sku = ANY(:skus);
 *
 * -- writeDeliveryStatus
 * INSERT INTO masar_delivery_status
 *        (order_id, status, occurred_at, pod_reference, exception_code, note)
 * VALUES (:orderId, :status, :occurredAt, :podReference, :exceptionCode, :note);
 * ```
 *
 * Where `length_cm`/`width_cm`/`height_cm` are absent, the adapter falls back to the
 * category defaults table and marks the product `dimensionsEstimated: true` so the
 * estimate is visible on the manifest instead of silently pretending to be measured.
 */
export interface MaslamaniDbConfig {
  replicaConnectionString: string;
  writeConnectionString: string;
  /** category -> assumed cube/weight/crew/install, used until the master is enriched. */
  categoryDefaults: Record<
    string,
    { cubeM3: number; weightKg: number; crewRequired: 1 | 2; installType: Product['installType'] }
  >;
}
