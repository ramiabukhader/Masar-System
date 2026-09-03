# 04 — Canonical Data Model & DB Integration

How Masar models the world, and exactly how it plugs into the retailer's existing database.

---

## 1. Canonical model

Masar's internal model is deliberately *not* a copy of their commerce schema. It is the model a
delivery network needs. The adapter's job is to translate.

```
Customer ──1:N── Order ──1:N── OrderLine ──N:1── Product
                    │
                    └──1:N── Shipment ──1:N── ShipmentUnit
                                 │
                                 └──N:1── Stop ──N:1── Route ──N:1── Vehicle
                                                          │
                                                          └──N:1── Driver
```

The critical transformation is **OrderLine → ShipmentUnit**. A commerce system thinks in
*"1 × Samsung RT38 refrigerator"*. A delivery system must think in
*"one 0.98 m³, 74 kg, 2-crew, plumbing-install, non-stackable unit"*. If the product master does not
carry dimensions, weight and install type, that transformation is impossible and **the whole
optimisation is impossible**. See §4 — this is workstream zero.

### 1.1 Core entities (as implemented, `src/core/types.ts`)

| Entity | Key fields |
|---|---|
| `Product` | `sku`, `name`, `class` (A/B/C), `cubeM3`, `weightKg`, `fragile`, `stackable`, `installType`, `crewRequired`, `handlingMinutes` |
| `Order` | `id`, `customerId`, `channel`, `originBranchId`, `confirmedAt`, `dueAt`, `paymentType`, `amountDue`, `lines[]` |
| `Customer` | `id`, `name`, `phone`, `address` (normalised), `location`, `access` (floor, elevator, stairWidth, parking) |
| `Shipment` | `id`, `orderId`, `originId`, `destination`, `units[]`, `dueAt`, `releaseAt`, `serviceMinutes`, `requiresCrew`, `requiresSkills[]`, `zone` |
| `Vehicle` | `id`, `type`, `capacityM3`, `capacityKg`, `crewSize`, `eligibleZones[]`, `costPerKm`, `costPerHour`, `homeNodeId` |
| `Driver` | `id`, `name`, `skills[]`, `eligibleZones[]`, `shiftStart`, `shiftEnd` |
| `Route` | `id`, `vehicleId`, `driverId`, `stops[]`, `loadPlan[]`, metrics |
| `Stop` | `shipmentId`, `seq`, `arriveAt`, `departAt`, `window`, `status` |

### 1.2 Geography

`Zone` is the access-regime partition (`north`, `central`, `south`, `jerusalem`, `jordan_valley`),
and it is what makes Jerusalem plannable safely. `Locality` is the gazetteer entry
(governorate → city → locality) that free-text addresses normalise onto.

---

## 2. The adapter contract

Everything the platform needs from their database sits behind one interface. This is the entire
surface area of the integration:

```ts
export interface OrderSource {
  /** Orders confirmed but not yet delivered, within the planning horizon. */
  fetchPendingOrders(horizon: { from: Date; to: Date }): Promise<Order[]>;
  fetchCustomers(ids: string[]): Promise<Customer[]>;
  fetchProducts(skus: string[]): Promise<Product[]>;
  fetchBranches(): Promise<Node[]>;
  /** Stock on hand per node, to decide sourcing. */
  fetchInventory(skus: string[]): Promise<InventoryRecord[]>;
  /** The ONLY write path back into their system. */
  writeDeliveryStatus(update: DeliveryStatusUpdate): Promise<void>;
}
```

```ts
export interface DeliveryStatusUpdate {
  orderId: string;
  status: 'planned' | 'out_for_delivery' | 'delivered' | 'partial' | 'failed' | 'returned';
  occurredAt: Date;
  podReference?: string;
  exceptionCode?: string;
  note?: string;
}
```

Two implementations ship:

- **`MockOrderSource`** — seeded, deterministic, drives the demo in this repo. No DB required.
- **`CommerceDbOrderSource`** — thin SQL implementation against the retailer's read-replica.
  Skeleton and the queries it needs are in §3.

Swapping is one line in configuration. **Nothing in the optimiser, the UI, or the driver app knows
which one is active.** That is the point: the demo you show them is running the same code that will
run in production.

---

## 3. Mapping to their stack

Their site is custom PHP with its own DB (confirmed by `.php` routing and campaign microsites — not
Shopify or Magento, so no platform API sits in the way). Actual table names come out of discovery;
the mapping below is the shape to expect and the questions each one answers.

| Masar needs | Expect to find | Watch out for |
|---|---|---|
| `Order.confirmedAt` | order header create/confirm timestamp | Web order vs showroom order may use different columns. **The SLA clock must start from confirmation, not from cart creation** |
| `Order.originBranchId` | branch/store id on the header | Showroom orders may store the *selling* branch, which is not necessarily the *fulfilling* branch |
| `Order.channel` | source flag | Phone/WhatsApp orders may be keyed in as showroom orders — ask |
| `Order.paymentType` | payment/instalment reference | **Bank instalment orders must expose an "paperwork complete" flag**, or drivers will arrive unable to release goods |
| `OrderLine.sku`, `qty` | line items | — |
| `Product.cubeM3`, `weightKg` | product master dimensions | **Most likely missing or partial. This is the #1 integration risk** |
| `Product.installType` | probably absent | Derivable initially from category → rules table, then corrected |
| `Customer.address` | free text | Will need normalisation + geocoding; expect 20–40% needing human confirmation in month one |
| `Customer.phone` | phone | Must be mobile-valid for SMS/WhatsApp window confirmation |
| `Inventory` | stock by branch | Needed for sourcing; if unreliable, Phase 1 plans from DC only |
| Write-back | new table `masar_delivery_status` | Additive only. No schema change to existing tables |

**Write-back table (the only DDL we ask them for):**

```sql
CREATE TABLE masar_delivery_status (
  id             BIGSERIAL PRIMARY KEY,
  order_id       VARCHAR(64) NOT NULL,
  status         VARCHAR(32) NOT NULL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  pod_reference  VARCHAR(128),
  exception_code VARCHAR(64),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_masar_status_order ON masar_delivery_status (order_id, occurred_at DESC);
```

Append-only. Their site reads the latest row per order to show the customer a status. No update, no
delete, no risk to their commerce data.

---

## 4. Workstream zero: the product master gap

**If nothing else in this document is acted on, act on this.**

The optimiser's value is bounded by the quality of `cubeM3`, `weightKg`, `crewRequired` and
`installType`. Without them, "truck full" is a guess and every plan is fiction.

Pragmatic path, in order of effort:

1. **Bulk-derive from category.** A rules table maps product category → default cube, weight, crew,
   install type. Rough, but immediately better than nothing: a "refrigerator" default of 0.9 m³ /
   70 kg / 2 crew / plumbing is far closer than no model at all.
2. **Enrich the top movers by hand.** The top ~200 SKUs will be 80% of delivered volume. Two people,
   a tape measure and a week gets the cube model to production quality where it matters.
3. **Pull from supplier data.** The major manufacturers all publish packaged dimensions.
   For an authorised distributor this data is obtainable, and it should become a required field at
   product onboarding from then on.
4. **Self-correct from the field.** The driver app captures "did not fit / heavier than expected"
   exceptions against a SKU, which feeds a correction queue. The model gets better every week it
   runs.

Steps 1 and 2 are enough to go live. Step 4 is what keeps it accurate.

---

## 5. Data quality gates

Before an order is allowed onto a route it must pass:

| Gate | Rule | If it fails |
|---|---|---|
| Address resolved | geocode confidence ≥ threshold | Human confirmation queue |
| Phone valid | mobile format, reachable | Call centre task |
| Cube known | every line has cube + weight (real or derived) | Planner alert; falls back to category default and is flagged on the manifest |
| Payment cleared | instalment paperwork complete flag | Held from planning, order stays on SLA clock, sales notified |
| Access surveyed | floor + elevator captured for Class A | Warning on plan; call centre asks before D-1 confirmation |
| Stock available | at origin, or transfer scheduled with release time ≤ due | Sourcing exception |

These gates are the difference between a route plan and a wish list. They are also, in practice,
where most of the "unorganised" feeling originates — bad data reaching the truck.
