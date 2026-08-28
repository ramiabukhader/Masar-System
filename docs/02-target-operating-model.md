# 02 — Target Operating Model

How Maslamani Home's delivery operation should run once **Masar** (مسار) is live.
This is the "path" — what changes, in what order, and what each change is worth.

---

## 1. The core design decision: keep 48h, add a window

Today: *"free delivery within 48–72 hours"* — a **deadline**, with no agreed arrival time.

The instinct is to compete on speed (same-day). **That is the wrong move right now**, and it is
worth being blunt about it with the client:

> Same-day delivery on a network that has not yet fixed failed first attempts, truck fill, or
> cross-branch consolidation would multiply the cost problem, not solve it. Same-day is a capability
> you earn *after* the base network is efficient — because same-day is profitable only when it rides
> on a dense, well-utilised route structure. Building it first means running near-empty express vans.

So the target model keeps the 48h promise and changes its **shape**:

| | Today | Target |
|---|---|---|
| Customer is told | "within 48–72 hours" | "Tuesday, between 10:00 and 14:00" |
| Confirmed | Never | Day before, by SMS/WhatsApp, with a one-tap reschedule link |
| Planner freedom | Total (but wasted) | Constrained to the agreed window — and the window is *chosen by the optimiser*, so it is a window the plan can actually hit |
| Failed attempts | 10–20% (typical without windows) | 3–5% |

The window is not a concession — it is the mechanism. It converts the customer from an
unpredictable variable into a scheduled resource, which is what makes the whole route plan hold.

**Same-day stays on the roadmap** as a Phase 4 capability, and the architecture is built for it from
day one: the optimiser already supports intra-day re-planning and hard time windows, so enabling
same-day later is a configuration and a fleet decision, not a rebuild. Section 6 covers this.

---

## 2. From branch-siloed dispatch to consolidated waves

**Today (inferred):** each branch dispatches its own orders to its own customers, when it has
enough of them, in whatever vehicle is free.

**Target:** the network plans in **waves**. A wave is a planning cycle that takes every order due
inside the horizon, from every origin, and produces one optimised set of routes.

```
                 ┌──────────────────────────────────────────┐
                 │        WAVE PLAN (16:00 daily)           │
                 │  all orders due in next 48h, all origins │
                 └──────────────────┬───────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   NORTH CORRIDOR              CENTRAL                     SOUTH CORRIDOR
   Jenin·Tubas·Tulkarem        Ramallah·Al-Bireh           Bethlehem·Hebron
   Qalqilya·Nablus·Salfit      Jericho                     + Jerusalem (separate
                                                             access regime)
```

Three structural changes fall out of this:

**2.1 Corridor consolidation, not branch dispatch.**
Orders are grouped by *delivery geography*, not by *selling branch*. A Nablus customer who bought in
the Ramallah showroom rides the north corridor truck, not a dedicated Ramallah van. This alone
removes the duplicated-kilometre problem (dossier §6, failure mode 3).

**2.2 Stock follows the route, via cross-dock.**
If the item sits in Ramallah and the customer is in Jenin, the item moves on the scheduled
inter-branch shuttle (a leg the network already runs for replenishment) and joins the north
corridor route. The customer's delivery is *planned around* that transfer, with the transfer's
arrival time as a hard release constraint. The system models this as a two-leg shipment, and it
will refuse to promise a window the transfer cannot support.

**2.3 Jerusalem is planned as its own sub-network.**
Different vehicles, different drivers, different eligibility. The optimiser treats zone eligibility
as a hard constraint (see 03 §4), so Jerusalem stops are only ever assigned to vehicles and drivers
flagged eligible. Nobody has to remember this rule — the plan cannot violate it.

---

## 3. Splitting the flow by product class

One delivery process for a fridge and for a Tefal kettle is the single easiest cost win available,
and it requires no software at all to state — only to enforce.

| Flow | Contents | Vehicle | Crew | Service time | Notes |
|---|---|---|---|---|---|
| **Heavy / install** | Class A: fridges, washers, cookers, ACs, large TVs | 3-ton truck / large van | 2 (installer + helper) | 15–45 min | Confirmed window mandatory. Access survey at point of sale mandatory |
| **Standard** | Class B + C: small appliances, kitchenware, glassware | Small van | 1 | 5–10 min | Fragile stacking rules apply |
| **Parcel** | Class B/C single-item, low value, no install | Third-party courier or standard van fill | — | — | Cheapest per drop; frees the fleet for what only it can do |
| **Mixed** | A + B/C to same customer | Follows the heaviest class | 2 | Sum | Never split a customer across two days without asking them |

The optimiser enforces this through vehicle/crew capability flags and per-line service-time models —
a Class A stop simply cannot be assigned to a 1-crew small van.

**Why this matters financially:** today a two-person crew in a 3-ton truck almost certainly delivers
kettles. Every one of those drops consumes the scarcest, most expensive resource in the network to
do work a 1-person van or a courier could do for a fraction of the cost.

---

## 4. The end-to-end flow, target state

```
 SALE                INTAKE              PLAN               PICK & LOAD         DELIVER            CLOSE
 ─────               ──────              ────               ───────────         ───────            ─────
 Showroom /          Address             Wave optimiser     Pick list in        Driver app:        POD synced
 web / phone         normalised          builds routes      delivery-reverse    navigate,          Cost per drop
      │              + geocoded          + windows          (LIFO) order        arrive, install,   computed
      │                   │                   │                  │             test, POD             │
      ▼                   ▼                   ▼                  ▼                  ▼                ▼
 Access survey ──▶  Serviceability ──▶  Window offered ──▶  Load verified ──▶  Customer signs ──▶ Exceptions
 captured at POS    check + SLA due     to customer          by scan           + photos            routed
                    timestamp set       D-1 confirm                                                to service
```

Five control points. Each one is a place where cost is either created or prevented:

| # | Control point | Owner | What it prevents |
|---|---|---|---|
| 1 | **Access survey at point of sale** — floor, elevator, stair width, parking, gas/water connection | Salesperson | The single most expensive failure: crew arrives, fridge does not fit, everyone goes home |
| 2 | **Serviceability + SLA clock at intake** | System, automatic | Promising a date the network cannot hit |
| 3 | **Window confirmation at D-1** | System + call centre for non-responders | Failed first attempt |
| 4 | **Scan-verified loading in LIFO sequence** | Warehouse/branch | Wrong item on truck; fragile crushed; driver unloading the whole truck at every stop |
| 5 | **POD with photos + functional test signature** | Driver | Damage disputes under the 24h policy; "it was never delivered" |

Full step-by-step SOPs for every role are in **docs/06** (English) and **docs/07** (Arabic).

---

## 5. Roles

| Role | Owns | Screen in Masar |
|---|---|---|
| **Salesperson** | Access survey, correct address, realistic expectation | POS prompt (Phase 2) / intake form |
| **Delivery Planner** (new, 1 per network) | Runs the wave, approves the plan, sets closure/degradation flags | Control Tower — Plan |
| **Branch/DC Supervisor** | Picking, staging, load verification, dock sequence | Branch Ops |
| **Driver / Installer crew** | The drop, the install, the POD, the cash | Driver app (mobile, Arabic, offline-capable) |
| **Dispatcher / Control Tower** | Live exceptions, re-plan, customer comms | Control Tower — Live |
| **Service Centre** | Damage and fault follow-up, return legs | Exception queue |
| **Finance** | Cash and instalment reconciliation per driver per day | Reconciliation report |

**The one new hire this needs is the Delivery Planner.** Everything else is existing people with a
better screen. That is a deliberate design goal — a model requiring five new roles does not survive
contact with a family retail business.

---

## 6. Phased roadmap

Each phase is independently valuable. Nothing here requires a big bang.

### Phase 1 — See it (Weeks 1–4)
Read-only integration with their DB. Order intake, address normalisation, geocoding against a
locality gazetteer, SLA clock, and the **Control Tower in observe mode**.
No change to how they operate. The deliverable is the **baseline number**: current cost per drop,
current first-attempt success rate, current SLA attainment.
> *Why first:* they cannot approve a change whose benefit they cannot measure. And the baseline is
> the negotiating position for everything that follows.

### Phase 2 — Plan it (Weeks 5–10)
Wave planner and optimiser go live in **advisory mode** — the planner sees the optimised plan next
to what the branches would have done, and chooses. Loading sequences and pick lists generated.
Access survey added at point of sale.
> *Expected:* 15–25% kilometre reduction, 10–20 points of truck-fill improvement.

### Phase 3 — Run it (Weeks 11–18)
Driver app in the field. Arrival windows offered to customers and confirmed at D-1. POD, photos,
cash collection, exception codes. Control Tower goes live for real-time re-planning.
**Paid haul-away of the old appliance launches here** — the one lever that adds margin
without touching the free-delivery promise (docs/09 §4.4).
> *Expected:* first-attempt success from ~85% to 95%+. This is the phase that pays for the programme.

### Phase 4 — Tune it, then accelerate (Month 5+)
Time-dependent travel matrix learned from the fleet's own GPS traces. Predictive SLA-risk alerting.
Automated courier hand-off for the parcel flow. Cost-per-drop dashboards per branch, driver, product
class.
**Then, and only then, same-day** — as a paid express tier on selected dense corridors, riding on a
route structure that is already efficient enough to absorb it.

---

## 7. Success metrics

The programme is judged on these, measured from the Phase 1 baseline.

| KPI | Definition | Typical today | Target |
|---|---|---|---|
| **Cost per drop** | (fuel + crew + vehicle + contracted) ÷ successful drops | baseline | **−25 to −35%** |
| **First-attempt success** | successful first attempts ÷ total attempts | 80–90% | **≥ 95%** |
| **SLA attainment** | delivered ≤ 48h ÷ total | unknown | **≥ 97%** |
| **Volumetric fill** | m³ loaded ÷ m³ usable | 40–55% | **≥ 75%** |
| **Drops per crew-hour** | successful drops ÷ paid crew hours | baseline | **+30%** |
| **Damage rate** | claims under 24h policy ÷ drops | baseline | **−50%** |
| **Plan stability** | stops delivered in planned sequence ÷ planned stops | n/a | **≥ 90%** |

Cost per drop is the headline. Everything else explains it.

---

## 8. What we are explicitly not doing

Worth stating, so scope stays honest:

- **Not replacing their ERP or POS.** Masar reads orders and writes back delivery status. That is the
  whole contract with their existing stack.
- **Not building a WMS.** Picking and staging screens, yes. Bin-level inventory management, no.
- **Not launching same-day in Phase 1–3.** See §1.
- **Not modelling checkpoints as political geography.** They are modelled as what they are
  operationally: arcs with time-of-day-dependent traversal costs and eligibility rules, learned
  from the fleet's own traces.
