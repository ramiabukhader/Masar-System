# 05 — Optimisation Specification

What the wave optimiser solves, how it solves it, and why each choice is the right one for
this network specifically. Implementation: `src/core/optimizer.ts`.

---

## 1. The problem, stated precisely

A **multi-depot, heterogeneous-fleet, capacitated vehicle routing problem with time
windows, time-dependent travel, and skill/access eligibility constraints.**

Given, for one delivery day:

- a set of **shipments**, each with a destination, a cube and weight, a service duration,
  a crew requirement, an installation skill requirement, an SLA deadline, an optional
  customer window, and a set of nodes it can be loaded from with a ready time;
- a set of **vehicles**, each with usable cube, payload, crew size, zone eligibility, a
  home node, and a cost structure;
- a set of **drivers**, each with installation skills, zone eligibility and a shift;
- a **time-dependent travel function** `t(from, to, departAt)`;

produce a set of routes that assigns every shipment to exactly one vehicle at one
position in one route, satisfying every hard constraint, minimising total cost.

---

## 2. Hard constraints — the plan cannot violate these

| # | Constraint | Why it is hard, not soft |
|---|---|---|
| 1 | Total cube ≤ vehicle usable cube | It physically will not fit |
| 2 | Total weight ≤ payload | Legal and safety limit |
| 3 | Shipment crew requirement ≤ vehicle crew size | Two people cannot be conjured at the door |
| 4 | Major appliances only on Class-A-capable vehicles | A small van cannot take a refrigerator |
| 5 | Installation skill ⊆ driver skills | **Gas work by an uncertified crew is not a cost trade-off** |
| 6 | Stop zone ∈ vehicle eligible zones ∧ driver eligible zones | Access regime. A vehicle that may not enter a zone cannot serve it at any price |
| 7 | Shipment must be stageable at the route's origin node | You cannot load what is not on that dock |
| 8 | Route start ≥ latest ready time of its shipments | A cross-dock transfer landing at 06:00 gates the whole truck |
| 9 | Arrival ≤ customer window close (when a window exists) | The window was promised |
| 10 | Arrival ≤ SLA due time − buffer | The 48h promise |
| 11 | Route end ≤ shift end + permitted overtime | Working-time limit |

Constraints 5 and 6 are the ones generic routing products get wrong here, and they are
the ones that make a plan undriveable rather than merely expensive.

---

## 3. Objective function

Minimise, over all routes:

```
cost(route) =  vehicle.fixedCost
             + vehicle.costPerKm    × distanceKm
             + vehicle.costPerHour  × (totalMinutes / 60)
             + overtimeCostPerHour  × overtimeHours
             + Σ transferCost(shipment)          // cross-dock consolidation

objective   =  Σ cost(route) + unassignedPenalty × |unassigned|
```

Three deliberate choices:

**`fixedCost` is what drives consolidation.** Without a cost for simply putting a vehicle
on the road, the optimiser sees no reason to prefer one full truck over two half-empty
ones. It is the single most important parameter in the model.

**Time is priced, not just distance.** Service time dominates this network — an
installation stop is 15–45 minutes. A model that minimises kilometres alone will happily
build a route that drives 20 km less and finishes two hours later.

**`unassignedPenalty` must dominate any routing saving.** Otherwise "optimising" means
quietly declining to deliver the awkward, expensive stops — which is the failure mode of
a naive objective and would be worse than no system at all.

Return legs to the depot are included. A model that ignores them understates every route.

---

## 4. Travel time

```ts
travel.leg(from, to, departAt) -> { km, minutes, crossingMinutes }
```

`minutes = (km / speed) × congestion(hour) × networkFactor + crossing(zonePair, hour)`

- **Distance** is road distance: straight line × a circuity factor for the zone pair.
  Never haversine (docs/01 §7.3).
- **Congestion** is an hourly multiplier — morning and late-afternoon peaks are the two
  that break delivery plans.
- **Crossing time** is charged only when a leg changes access zone, and varies by hour.
  This is the largest source of plan variance in this geography, so it is modelled
  explicitly rather than hidden inside an average speed.
- **A closed crossing returns `Infinity`**, which makes the arc impassable rather than
  merely expensive. Dispatchers toggle closures as first-class inputs.

**In production this whole layer is replaced** by a road-network matrix (OSRM, self-hostable)
plus per-arc, per-hour profiles **learned from the fleet's own GPS traces**. For this
geography the fleet's own history is the only trustworthy source of travel times, and it
gets better every week the system runs. The interface does not change — only the provider.

---

## 5. Service time

```
service = stopOverhead
        + Σ handlingMinutes × qty
        + Σ installMinutes  (second identical unit at 60%)
        + accessMinutes(floor, elevator, stairs, parking)
        + paymentMinutes
```

`accessMinutes` is the part naive planners omit and it routinely doubles a stop: four
floors with no usable lift and two appliances is 32 minutes of carrying before any
installation begins. **When the access survey was never taken the model assumes a second
floor rather than the ground floor** — optimistic defaults hide real risk and produce
plans that collapse before midday.

---

## 6. Algorithm

Exact methods are out of the question at this size and constraint richness, and unnecessary:
the input data (travel times, service estimates) carries more error than a good heuristic's
optimality gap. The engine uses construction plus local search, which converges in
well under a second for a full day's wave.

### 6.1 Construction — regret-2 insertion

For each unplaced shipment, compute its best and second-best feasible insertion across all
open routes. Insert the shipment with the **largest regret** (second-best minus best) —
i.e. the one that will hurt most if it is left until later. A shipment with only one
feasible route has effectively infinite regret and is placed immediately.

Plain greedy insertion is myopic: it fills the easy stops first and strands the awkward
ones — tight SLA, remote locality, a single eligible vehicle — with nowhere left to go.
Regret is what prevents that, and it is why the demo plans a full wave with zero
unassigned shipments while a greedy pass leaves stragglers.

When nothing can be inserted, a new vehicle is opened (cheapest first) and seeded with a
shipment it can serve. When no idle vehicle can take anything, the remaining shipments are
reported as unassigned **with a specific reason** — because at that point the fleet, not
the algorithm, is the binding constraint, and that is a management decision, not a bug.

### 6.2 Improvement — local search

Four neighbourhoods, applied in passes until no move improves or the time budget expires:

| Move | What it does | What it fixes |
|---|---|---|
| **Or-opt** | Relocate a segment of 1–3 stops within a route | Bad sequencing from insertion order |
| **2-opt** | Reverse a segment within a route | Route crossings |
| **Relocate** | Move one stop to its best position in another route | Stops assigned to the wrong corridor |
| **Swap** | Exchange two stops between routes | Local optima relocate alone cannot escape |
| **Route elimination** | Empty an entire route into the others, if the total is cheaper | **Fleet size** |

**Route elimination earns its own row.** Single-stop relocation will never close a route
on its own: moving any one stop out of a lightly-loaded van looks like a loss right up
until the last one leaves and the vehicle's fixed cost finally disappears. Evaluating the
whole emptying at once is where the fleet-size saving actually comes from — in the demo it
is the difference between 11 routes and 9.

Every move is evaluated by full re-simulation of the affected routes, because with
time-dependent travel a resequenced route has genuinely different travel times — the
classic O(1) delta evaluations of textbook VRP are simply invalid here.

### 6.3 Output

- Routes with stop sequences and planned arrival times
- **Promised arrival windows**, placed around the planned arrival with more slack after
  than before, because the day's variance runs late far more often than early
- **Loading manifest in reverse delivery order** (LIFO), with fragile non-stackable goods
  assigned to the top shelf regardless of sequence
- Per-route and per-plan metrics, including cost per drop
- A solver log showing what construction cost and what improvement saved

---

## 7. Intra-day re-planning

The same engine handles disruption. On a closure, breakdown, or a run of long stops:

1. Freeze completed stops and stops currently in progress.
2. Re-run the wave over **remaining undelivered shipments only**, with the current
   positions as route origins and the current time as the start.
3. Preserve already-communicated customer windows wherever feasible; where a window can no
   longer be met, flag it for a proactive customer notification rather than letting the
   customer discover it.

The demo's disruption simulator runs exactly this path — closing the Jerusalem crossings
or taking a truck off the road re-optimises the whole wave in a few hundred milliseconds.

---

## 8. Tuning parameters

| Parameter | Demo value | Effect of raising it |
|---|---|---|
| `windowLengthMinutes` | 180 | Easier to hit, less precise for the customer |
| `slaBufferMinutes` | 60 | Safer against variance, fewer feasible assignments |
| `maxOvertimeMinutes` | 60 | More drops per day, higher crew cost and fatigue |
| `unassignedPenalty` | 100,000 | More aggressive about serving everything |
| `improvementPasses` / `timeBudgetMs` | 30 / 4,000 ms | Better plans, slower response |
| `vehicle.fixedCost` | 130–320 | **Stronger consolidation, fewer vehicles** |
| `transferCostPerM3` | 12 | Less cross-branch consolidation |

These are the dials the Delivery Planner and the implementation team will actually turn.
Every one of them is a business trade-off with an operational meaning, not a magic number.

---

## 9. What this engine is not

- **Not a bin-packing solver.** It plans cube as a scalar capacity, not a 3D pack. The
  loading manifest gives sequence and shelf placement, which is what a crew can actually
  follow; true 3D packing would produce instructions nobody could execute.
- **Not a road router.** It consumes travel times from a provider; it does not compute
  turn-by-turn geometry. Navigation is handed to a real navigation app.
- **Not a forecaster.** It plans the orders that exist. Demand forecasting for campaign
  spikes (Ramadan, back-to-school) is a Phase 4 addition that would size the fleet ahead
  of the peak rather than reacting to it.
