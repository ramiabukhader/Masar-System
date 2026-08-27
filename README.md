# مسار · Masar

**Delivery orchestration and route optimisation for Maslamani Home (مسلماني هوم).**

A working demo of a system to automate and optimise Maslamani Home's delivery operation:
free delivery within 48 hours, with installation, across a corridor-shaped and
access-constrained network — currently run branch-by-branch, at a cost the business feels
but cannot yet measure.

---

## What is in here

| | |
|---|---|
| **`docs/`** | The research, the strategy, the architecture and the process manuals |
| **`src/core/`** | The real planning engine — domain model, travel model, optimiser |
| **`src/data/`** | A seeded West Bank scenario: gazetteer, branch network, brand catalogue, fleet |
| **`src/ui/`** | The demo application — Control Tower, Branch Ops, Driver App, Process Guide |

### Documents

| Doc | What it answers |
|---|---|
| [`01-research-dossier.md`](docs/01-research-dossier.md) | Who they are, what they sell, how they sell it, and where the delivery cost actually leaks |
| [`02-target-operating-model.md`](docs/02-target-operating-model.md) | The path: what changes, in what order, and what each change is worth |
| [`03-architecture.md`](docs/03-architecture.md) | How Masar plugs into their existing PHP stack without owning it |
| [`04-data-model-and-db-integration.md`](docs/04-data-model-and-db-integration.md) | The canonical model, the adapter contract, and the product-dimension gap that gates everything |
| [`05-optimization-spec.md`](docs/05-optimization-spec.md) | What the optimiser solves and how |
| [`06-sop-en.md`](docs/06-sop-en.md) | End-to-end SOPs, English |
| [`07-sop-ar.md`](docs/07-sop-ar.md) | نفس الإجراءات بالعربية — للفريق والسائقين |

---

## Running the demo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 22 tests over the planning engine
npm run build
```

Four screens, Arabic-first with an English toggle:

- **غرفة التحكم · Control Tower** — the wave plan, KPIs against a modelled current-state
  baseline, network map, unassigned and data-gate queues, the solver's own log, and a
  disruption simulator. Toggle a crossing closure or a truck breakdown and the whole wave
  genuinely re-optimises in front of you.
- **عمليات الفرع · Branch Ops** — pick list and the LIFO loading manifest, with in-box
  position and scan verification.
- **تطبيق السائق · Driver App** — the crew's phone: navigate, arrive, access check,
  installation checklist, functional test, proof of delivery, payment, coded exceptions.
- **دليل العمليات · Process Guide** — all 23 steps from sale to close-out, each with its
  owner and the specific loss its guard prevents.

---

## What is real and what is simulated

Being precise about this matters more than the demo looking impressive.

**Real:**
- The optimiser. Regret-2 insertion plus local search, with every hard constraint enforced —
  cube, payload, crew size, installation certification, zone eligibility, staging origin,
  customer window, SLA deadline, shift length. It is the same `runWave` a production job
  would call.
- The travel model's *shape*: time-dependent, asymmetric, with explicit zone-crossing costs
  and closures as impassable arcs.
- The service-time model: handling, installation, stairs and lifts, doorstep payment.
- The branch network, brand portfolio, delivery promise and damage policy — from Maslamani
  Home's own public information.

**Simulated, and to be replaced with their data:**
- Orders, customers and stock positions are generated from a fixed seed.
- Product dimensions are representative, not measured. **This is the single biggest
  integration dependency** — see [`docs/04` §4](docs/04-data-model-and-db-integration.md).
- Travel times come from zone-pair circuity factors and hourly profiles, not a road network.
  Production swaps in OSRM plus per-arc profiles learned from the fleet's own GPS traces.
- Fleet composition, vehicle costs and the distribution centre location are assumptions
  pending discovery.
- **The before/after comparison is a modelled counterfactual**, not a measurement. It shows
  the shape of the saving. The real baseline is measured from their own history in Phase 1,
  and that number — not this one — is what the programme should be judged against.

Every assumption in the research is tagged **[V]** verified, **[I]** inferred, or **[?]**
must be confirmed. Nothing tagged **[?]** should be presented to the client as fact.

---

## The argument in five lines

1. Delivery is free to the customer, so every wasted kilometre comes straight off margin.
2. A 48-hour deadline with no agreed arrival window is the direct cause of failed first
   attempts — the most expensive event in the network.
3. Branch-siloed dispatch duplicates kilometres that consolidation removes.
4. Trucks are planned by order count, not by cube, so they leave half empty.
5. None of it is measured, which is why it feels unorganised.

Keep the 48-hour promise. Add the window. Consolidate into waves. Plan by cube. Measure
cost per drop. Same-day comes later — and only once the base network is efficient enough
to carry it.

---

## Status

Demo and proposal. Not connected to any Maslamani Home system, and holding no real customer
data. The integration contract is deliberately narrow: read orders, customers, products,
inventory and branches from a read-replica; write back one thing — delivery status.
