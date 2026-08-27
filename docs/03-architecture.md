# 03 — System Architecture: Masar (مسار)

**Masar** = "route / path" in Arabic. The delivery orchestration and optimisation platform.

---

## 1. Principle: read their world, own ours

Maslamani Home has a working custom PHP stack with its own database. We do not migrate it, wrap it,
or fight it.

```
   THEIR WORLD (source of truth for commerce)      OUR WORLD (source of truth for delivery)
   ┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
   │  POS / showroom                      │        │  Masar                               │
   │  maslamanihome.com (PHP)             │──────▶ │   order intake → plan → dispatch     │
   │  Orders · Customers · Products       │  read  │   → deliver → close                  │
   │  Inventory · Branches                │        │                                      │
   │                                      │ ◀──────│  writes back ONLY: delivery status,  │
   └──────────────────────────────────────┘  write │  timestamps, POD ref, exception code │
                                                   └──────────────────────────────────────┘
```

**The integration contract is deliberately narrow:** we read orders, customers, products, inventory
and branches. We write back exactly four things — delivery status, actual delivery timestamp, POD
reference, and exception/reason code. Nothing else. That keeps their commerce system authoritative,
keeps the blast radius near zero, and means Phase 1 can go live against a **read-replica** with a
single write-back table.

---

## 2. Component map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CHANNELS / UI                                     │
│                                                                              │
│  Control Tower (web, dispatcher)   Branch Ops (web, tablet)   Driver App     │
│  · Plan · Live map · Exceptions    · Pick · Stage · Load      (PWA, RTL,     │
│  · SLA risk board · KPIs           · Scan verify              offline-first) │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                          MASAR CORE SERVICES                                 │
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Intake &  │→ │  Sourcing  │→ │    Wave     │→ │ Dispatch │→ │  Proof  │ │
│  │ Normalise  │  │ & Feasib.  │  │  Optimiser  │  │ & Track  │  │ & Close │ │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────┘  └─────────┘ │
│        │               │                │               │            │       │
│  ┌─────▼───────────────▼────────────────▼───────────────▼────────────▼─────┐ │
│  │  SUPPORTING: Geocoder · Travel-Time Service · Cube & Service-Time Model │ │
│  │              Notification Service · Cost Ledger · Event Log             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                          ADAPTERS (swap-in points)                           │
│  OrderSource      TravelTimeProvider    NotificationChannel   GeocodeProvider│
│  ├ Mock (demo)    ├ Matrix+profiles     ├ Mock (demo)         ├ Gazetteer    │
│  └ MaslamaniDB    ├ OSRM/road-network   ├ SMS gateway         └ External     │
│                   └ Learned-from-GPS    └ WhatsApp Business API              │
└─────────────────────────────────────────────────────────────────────────────┘
```

Every external dependency sits behind an adapter interface. The demo in this repo runs entirely on
the Mock implementations; production swaps the adapter, not the core.

---

## 3. Service responsibilities

### 3.1 Intake & Normalise
- Polls / receives orders from `OrderSource`
- **Address normalisation** against a Palestinian locality gazetteer (governorate → city → locality →
  neighbourhood). Free-text addresses from showroom sales are the dirtiest input in the system
- **Geocoding** to lat/lon, with a confidence score. Low confidence → queued for human confirmation
  before it can be planned, never silently guessed onto a route
- **SLA clock**: `dueAt = confirmedAt + slaHours` (48, configurable per service tier), adjusted for
  working calendar and cut-offs
- **Shipment building**: order lines → shipment units with cube, weight, fragility, install type,
  crew requirement

### 3.2 Sourcing & Feasibility
- Chooses the fulfilling node per line (branch stock vs DC), preferring **one node, one shipment**
- Where a transfer is needed, creates a two-leg shipment and sets a **release-time constraint** equal
  to the shuttle's arrival
- **Serviceability check**: is the destination in a served zone, is there an eligible vehicle class,
  is the SLA achievable given the release time? Fails loudly at intake, not at 07:00 on the truck

### 3.3 Wave Optimiser
The mathematical core. Detailed in **docs/05**. Solves a rich VRP:
capacitated (weight **and** volume), time windows, heterogeneous fleet, crew-skill constraints,
zone eligibility, time-dependent travel, per-item service times, shift limits, SLA hard deadlines.
Outputs routes, stop sequences, arrival windows, and a **loading manifest in reverse-delivery order**.

### 3.4 Dispatch & Track
- Publishes routes to the Driver App; accepts live position and status events
- **ETA projection** against plan; flags SLA risk before it becomes SLA failure
- **Intra-day re-optimisation**: on a closure, breakdown, or a run of long stops, re-plans the
  *remaining undelivered stops only*, preserving already-communicated windows wherever feasible
- Triggers customer notifications: D-1 window confirmation, day-of "you are next", arrival

### 3.5 Proof & Close
- POD: photos, signature, functional-test confirmation, per-item accept/damage/refuse
- Cash and bank-instalment collection recorded per stop, reconciled per driver per day
- Exception codes drive downstream work: re-delivery, service centre job, return leg
- **Cost ledger**: every leg attributed — distance, time, crew cost, vehicle cost — so cost per drop
  is a computed fact, not a monthly estimate

---

## 4. The constraint model (why generic tools fail here)

The optimiser treats these as **hard constraints** — the plan cannot violate them:

| Constraint | Modelled as |
|---|---|
| Vehicle cube and payload | Bin capacity in m³ and kg, per vehicle |
| Crew size for heavy items | Item requires `crewRequired`; vehicle carries `crewSize` |
| Installation skill | Item requires `installType` ∈ {gas, plumbing, electrical, mount}; driver holds skill set |
| **Zone eligibility** | Vehicle + driver carry `eligibleZones`; a stop in a non-eligible zone is unassignable — this is how Jerusalem access is enforced structurally |
| Customer time window | Hard `[earliest, latest]` at the stop |
| SLA deadline | Hard: arrival ≤ `dueAt` |
| Shift limit | Route duration ≤ driver shift; overtime allowed only as a costed soft constraint |
| Release time | Stop cannot be served before its stock transfer lands |

And these as **soft, costed** objectives, minimised in weighted combination:
travel distance, travel time, crew time, overtime, number of vehicles used, window-midpoint
deviation, and a large penalty for any unassigned shipment.

**Time-dependent travel** deserves its own note. `TravelTimeProvider.time(from, to, departAt)`
returns a duration that varies by departure hour. In the demo this is a matrix plus per-arc hourly
multipliers seeded from realistic corridor behaviour. In production it is learned from the fleet's
own GPS traces — which, for this geography, is the only trustworthy source. Static-matrix planners
are not slightly wrong here; they are structurally wrong.

---

## 5. Deployment shape

```
Branch tablets ─┐
Driver phones ──┼─▶  Masar app servers ──▶  Masar DB (Postgres + PostGIS)
Dispatcher PCs ─┘         │
                          ├──▶  read-replica of Maslamani commerce DB  (read-only)
                          ├──▶  write-back table in commerce DB        (status only)
                          ├──▶  OSRM / road-network routing service    (self-hostable)
                          └──▶  SMS / WhatsApp Business API
```

**Offline-first driver app is non-negotiable.** Connectivity across the corridor is inconsistent.
The Driver App is a PWA holding its full manifest locally, queueing POD and status events, and
syncing when signal returns. A driver must never be blocked at a customer's door by a dead bar of
signal.

**Hosting:** can run on-premise at their DC or in a regional cloud. The only hard requirement is a
low-latency path to the commerce DB replica. Nothing in the design requires egress to a specific
foreign cloud region.

---

## 6. Security and data boundaries

- Read-only DB credentials for the commerce replica; the single write-back path is a dedicated
  status table with its own restricted user
- Customer PII (name, phone, address) stays inside Masar; the driver app receives only the minimum
  needed per stop and holds it only while the stop is open
- Photos in POD are stored against the order and purged on a retention schedule
- Every plan, re-plan, and status change is written to an append-only event log — which is also what
  makes cost-per-drop and dispute resolution possible
