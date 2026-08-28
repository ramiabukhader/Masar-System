# 09 — How the good operators do it

Benchmark research: retailers that carry their own inventory and run their own delivery,
what they actually built, and what of it transfers to Maslamani Home.

The brief was "find good companies who have their own trucks and their own system, and see
how they automate it." So this deliberately skips Amazon — a parcel network at that scale
solves a different problem — and looks at **big-and-bulky retailers with installation**,
which is exactly Maslamani Home's problem.

---

## 1. The five that matter

### 1.1 Coolblue — delivery as the product
*Netherlands, Belgium, Germany · consumer electronics and appliances*

Coolblue runs **its own delivery and installation service** for large electronics —
washing machines, refrigerators, televisions — and has done since 2017. The critical
structural detail is that they run **separate 1-man and 2-man delivery networks**, and the
2-man network does placement, installation and mounting at the door. They build dedicated
warehouses specifically to feed the delivery arm rather than treating it as store overflow.

**What transfers:** the 1-man/2-man split is not an optimisation, it is the *architecture*.
Once the two networks are separate, everything downstream gets simpler — vehicle choice,
crew rostering, service-time models, cost per drop. This is the same conclusion the
target operating model reaches from first principles (docs/02 §3), arrived at by a company
that has run it profitably for years.

**What does not:** Coolblue treats delivery as a marketing differentiator and invests
accordingly. Maslamani Home is not in a market where that arms race pays yet.

---

### 1.2 John Lewis — the closest comparable, with numbers
*United Kingdom · department store, large electricals and furniture*

John Lewis rebuilt home delivery for "two-man" products around **a dynamic slot-booking
system** (implemented with Descartes). Customers and staff book a delivery appointment
**in real time, both on the website and at the point of sale**, with the system offering
only slots the network can actually serve.

Published results: **£1.8m cut from fulfilment costs**, and **an average of one mile
removed from every delivery route.**

Note what they did *not* do: the standard slot for a large item delivered by their own
crews is **10 hours**. Even a retailer with a mature own-fleet operation does not give away
a narrow window for free — they give a *committed* window, which is a different thing.

**What transfers — and this is the most important finding in this document:**

> Booking the slot **at the point of sale**, against real capacity, beats confirming a
> window the day before.

Our design (docs/02 §1) confirms the window at D-1. John Lewis's version is strictly
better: the salesperson on the showroom floor sees which slots the network can actually
serve and books one while the customer is standing there. It removes an entire
call-centre step, it removes the "customer never responded to the SMS" failure mode, and
it turns the delivery promise from something the operation has to live up to into
something the operation has already agreed to.

**This changes our design. See §4.**

---

### 1.3 Lowe's — stop routing appliances through stores
*United States · home improvement, major appliances*

Lowe's moved to a **market delivery model**: large products **skip the stores entirely**
on their way to the customer, flowing through bulk distribution centres and cross-dock
delivery terminals instead. They added six cross-dock terminals and four bulk DCs for
large products in a single year.

Reported outcomes: higher operating margins, higher appliance sales, improved inventory
turns, **reduced damages**, and better on-time delivery rates.

**What transfers:** every touch is a chance to damage a refrigerator and a chance to lose
an hour. A showroom is a place to *sell* an appliance, not a place to *handle* one. The
reduced-damages result is the one to quote to Maslamani Home, because it maps directly
onto their own 24-hour damage-claim exposure.

Our architecture already supports this — shipments carry staging options and can be
consolidated at a DC or corridor hub rather than the selling branch (docs/03 §3.2). What
we had not done is state it as a **policy**: Class A goods should not route through a
showroom at all.

---

### 1.4 Home Depot — purpose-built nodes and overnight positioning
*United States · home improvement*

Home Depot built two new node types rather than adapting old ones: **Market Delivery
Operations** for big-and-bulky, and **Flatbed Distribution Centres** — roughly 150 new
facilities under a $1.2bn programme. Their "Relay" method drops loaded trailers at store
car parks overnight for next-morning delivery.

**What transfers:** not the capital programme — the *overnight positioning* idea. Stock
moves while the network is idle so that crews start their shift with the truck already
loadable. That is exactly the overnight shuttle in our model, and it is worth knowing a
$1.2bn network converged on the same mechanic.

---

### 1.5 Best Buy — sell the services around the free delivery
*United States · consumer electronics*

Best Buy delivers and installs major appliances through Geek Squad, and **charges for the
adjacent services**: haul-away and recycling of the old appliance (about $50), installation
upgrades, and a workmanship warranty on the service itself.

**What transfers:** Maslamani Home gives delivery and basic installation away free, so
there is no delivery line to price. But there are billable services sitting right next to
it that customers genuinely want — taking the old fridge away is the obvious one. It does
not touch the free-delivery promise, and it rides on a truck and a crew that are already at
the door.

---

### 1.6 IKEA — the instructive counter-example
*Global · furniture and home*

IKEA deliberately **does not own its delivery fleet**. It moves roughly 10,000 vehicles
through partners — DHL, UPS, PostNord — and **charges the customer** for bulky delivery
(£15–40 in the UK, scaled by size and value).

**What transfers:** the trade-off, stated plainly. Outsourcing the fleet is viable when you
charge for delivery, because the cost lives in a line item the customer pays. Maslamani
Home has chosen free delivery with installation, which means **they cannot outsource the
margin problem away — they have to own the efficiency.** That is not a criticism of the
free-delivery promise; it is the reason the promise requires this system.

---

## 2. The techniques underneath

### 2.1 Constraint-aware routing beats a static daily plan by 10–25%

Big-and-bulky routing has to resolve, per stop: vehicle type and payload, the delivery
window, access restrictions, and crew requirement (1-man vs 2-man). Industry sources put
the documented gain from constraint-aware routing at **10–25% cost reduction versus a
static daily plan**.

**Use this number.** Our demo's modelled comparison shows a larger figure because the
modelled current state is deliberately unfavourable. 10–25% is the defensible range to put
in front of a client, with the demo used to show *how* it happens rather than *how much*.

### 2.2 Regional docks plus algorithmic cube stacking

The pattern the specialists describe is regional docks near demand, feeding last-mile
trucks planned by **cube**, so line-haul stays full and the last mile stays balanced. This
is the corridor-hub structure in our model, and it validates cube-first load planning over
order-count planning.

### 2.3 Slot promises driven by routing capacity, not by a calendar

A delivery promise engine has to answer questions only the routing system can answer:
actual remaining capacity per slot per zone, the **marginal cost of adding one more order
to a given slot**, and whether the promise is deliverable at all. Where retailers want to
shape demand, they discount off-peak slots and price peak ones — smoothing the day rather
than rationing it.

**For Maslamani Home, without charging anything:** offer the customer two or three slots
and *label* the one that is cheapest for the network to serve. A "recommended" tag moves a
large share of customers at zero cost to the promise.

### 2.4 Failed deliveries: the numbers that justify the whole programme

| Metric | Published figures |
|---|---|
| First-attempt failure rate | **8–20%**, varying by geography and delivery type |
| Cost of a failed parcel attempt | ~$17–18 (US), ~€14 (EU) |
| Cost of a failed **big-and-bulky** attempt | **a multiple of the parcel figure** |
| Processing one large furniture return | **$55–90+ per piece**, before restocking or disposal |
| Customers unlikely to return after a delivery failure | **70%** |

That last row is the one to lead with. A failed delivery is not a logistics cost, it is a
customer-retention event — and for a retailer whose delivery is free and advertised, it is
a broken promise the customer paid attention to.

---

## 3. Scorecard: where Maslamani Home sits

| Practice | Coolblue | John Lewis | Lowe's | Best Buy | Maslamani today | Masar target |
|---|---|---|---|---|---|---|
| Own fleet for big-and-bulky | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Installation at the door | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Separate 1-man / 2-man networks | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Phase 2 |
| Slot booked at point of sale | — | ✅ | — | ✅ | ❌ | ✅ **Phase 2 (moved up)** |
| Appliances bypass the store | — | — | ✅ | ✅ | ❌ | ✅ Phase 2 |
| Overnight stock positioning | ✅ | ✅ | ✅ | ✅ | ❓ | ✅ Phase 2 |
| Cube-based load planning | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Phase 2 |
| Constraint-aware routing | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Phase 2 |
| Cost per drop measured | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Phase 1 |
| Paid adjacent services | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Phase 3 |
| Paid express tier | ✅ | ✅ | ✅ | ✅ | ❌ | Phase 4 |

Maslamani Home already has the expensive half — the fleet, the crews, the installation
skills, the branch network. What is missing is the **system layer** on top of it. That is a
much better position to start from than the reverse.

---

## 4. What we change as a result

Four changes to the design, all of them earned from the benchmarks rather than invented.

### 4.1 Move the slot promise to the point of sale *(from John Lewis)*

**Was:** optimiser assigns a window; customer confirms it by SMS the day before.
**Now:** the salesperson offers 2–3 real, capacity-checked slots while the customer is
still in the showroom, and books one.

The D-1 confirmation stays, but it becomes a *reminder* rather than the first time the
customer hears a time. This removes the largest remaining failure mode in the design — the
customer who never answers the confirmation message.

Technically this needs a **promise engine**: a capacity-and-cost query against the same
planner the wave uses. `POST /promise { destination, items } → [{ slot, deliverable, marginalCost }]`.
It is the same feasibility check the optimiser already performs; it just runs for one
prospective order instead of a whole wave.

### 4.2 Class A goods bypass the showroom *(from Lowe's)*

Stated as policy, not left to the planner's discretion: major appliances flow
DC → corridor hub → customer, and are staged at a showroom only by exception. Fewer
touches, less damage, and showroom staff stop handling refrigerators.

### 4.3 Label the cheapest slot *(from dynamic slot pricing, adapted)*

Maslamani Home cannot charge for delivery, so it cannot price slots. It can still **shape
demand for free** by marking the slot that is cheapest to serve as the recommended one.
Same mechanism, no change to the promise, no cost to the customer.

### 4.4 Add paid adjacent services *(from Best Buy)*

Haul-away and recycling of the old appliance, as a paid add-on sold at the point of sale
and executed by the crew that is already there. It is the one lever that adds margin
without touching the free-delivery promise.

---

## 5. What we deliberately do not copy

- **IKEA's outsourced fleet.** Only works if you charge for delivery. Maslamani Home does not.
- **Home Depot's $1.2bn node programme.** The idea (purpose-built big-and-bulky nodes)
  transfers; the capital does not. One DC and two corridor hubs is the right scale here.
- **Same-day, for now.** Every operator on this list launched express *after* their base
  network was efficient. Best Buy and Coolblue both run it on top of dense, well-utilised
  routes. Doing it first is how you multiply a cost problem.
- **Narrow free windows.** John Lewis's own-crew standard slot is ten hours. A committed
  three-hour window is already more generous than the benchmark; going narrower for free
  would be a promise the network cannot keep.

---

## 6. Sources

- [Coolblue — delivery service](https://www.coolblue.de/en/c/coolblue-delivery-service.html) · [Coolblue infrastructure](https://aboutcoolblue.com/en/infrastructure/) · [The Coolblue story](https://aboutcoolblue.com/en/yearbook/the-coolblue-story/)
- [John Lewis home delivery case study (Descartes)](https://www.descartes.com/resources/descartes-home-delivery-solution-provides-john-lewis-with-an-end-to-end-platform-for-home-and-last-mile-delivery-operations) · [John Lewis Partnership case study](https://routinguk.descartes.com/customer-successes/john-lewis-partnership) · [UK delivery terms](https://www.johnlewis.com/customer-services/delivery-information/uk-delivery)
- [Lowe's market delivery model](https://www.retaildive.com/news/lowes-delivery-model-regions-products/637351) · [Lowe's network retooling](https://www.supplychaindive.com/news/lowes-adapting-supply-chain-challenges-e-commerce-demand-don-frieson/621718/)
- [Home Depot flatbed distribution centres](https://corporate.homedepot.com/newsroom/supply-chain-unveils-first-flatbed-distribution-center-fdc) · [Home Depot's new last mile](https://phenomenalworld.org/analysis/home-depots-new-last-mile/)
- [Best Buy appliance services](https://www.bestbuy.com/site/services/appliance-services/pcmcat255100050002.c?id=pcmcat255100050002)
- [IKEA / Wayfair omnichannel furniture retail analysis](https://inpractise.com/articles/newsletter-20220419)
- [Big and bulky last-mile optimisation](https://www.metroscg.com/insights/how-to-optimize-your-big-and-bulky-last-mile-delivery-service) · [Big and bulky delivery software buyer's guide](https://grasshopperlabs.io/blog/best-big-and-bulky-delivery-software-2026-buyers-guide/) · [Big and bulky delivery management](https://locus.sh/blogs/big-and-bulky-delivery-management/)
- [Dynamic delivery slot pricing](https://locus.sh/blogs/dynamic-delivery-slot-pricing-routing-data/) · [Time-slot booking efficiency (ORTEC)](https://ortec.com/resources/insights/e-grocery-time-slot-booking)
- [Failed first-attempt cost framework](https://locus.sh/blogs/failed-first-attempt-delivery-cost-framework-us/) · [Delivery success rate statistics](https://smartroutes.io/blogs/delivery-success-rates-key-stats-for-retail-and-ecommerce/) · [Last-mile delivery statistics](https://smartroutes.io/blogs/last-mile-delivery-statistics-the-complete-data-resource/)
