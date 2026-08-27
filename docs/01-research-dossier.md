# 01 — Research Dossier: Maslamani Home

**Prepared:** August 2026
**Subject:** Maslamani Home (مسلماني هوم) — retail chain of Maslamani Group
**Purpose:** Establish the commercial and operational baseline before designing the delivery automation and optimisation programme.

---

## 0. A note on sourcing and confidence

This session's network policy blocked direct access to `maslamanihome.com`, `maslamani.com`,
`almaslamani.ps` and `jobs.ps`, so the company's own pages could not be crawled page-by-page.
Everything below was assembled from indexed search results, the group's public brand pages, and
retail/logistics domain knowledge.

Every statement is tagged:

| Tag | Meaning |
|---|---|
| **[V]** | Verified from a public Maslamani source (site copy, group page, indexed page) |
| **[I]** | Inferred with high confidence from the product mix and business model |
| **[?]** | Assumption that **must be confirmed** with the client before build |

Nothing tagged **[?]** should be treated as fact in a client-facing conversation. Section 8 is the
consolidated discovery list — it is the first thing to run through when we get DB access.

---

## 1. Company at a glance

| | |
|---|---|
| Group founded | 1969, by Al-Haj Khader Al-Maslamani **[V]** |
| Retail chain founded | Maslamani Home, 2017 **[V]** |
| Market | Palestine — West Bank + Jerusalem; group also distributes into the Israeli market **[V]** |
| Positioning | *"The largest chain store for the world's leading brands in home appliances, small electrical appliances, kitchenware and gifts"* **[V]** |
| Group activity | Household appliance and electrical/electronic goods wholesale + retail + after-sales service **[V]** |
| After-sales | Authorised service centre, described by the group as the largest in the region **[V]** |

The group is a **wholesale distributor first, retailer second**. That matters enormously for
delivery: it means there is already an inbound/warehouse logistics function serving dealers, and the
retail delivery fleet is very likely sharing vehicles, yard space and people with it. Any
optimisation that only looks at retail last-mile will fight the wholesale schedule for the same
trucks. **[I]**

---

## 2. Brand and product portfolio — what actually goes on the truck

Brands carried (agency / exclusive distribution): **KMG** (own/house brand), **Samsung**, **TCL**,
**Ariston**, **Lofra**, **Elica**, **Turbo Air**, **JBL**, **Moulinex**, **Tefal**, **Krups**,
**BaByliss**, **Emsa**, **Pyrex**, **Luminarc**, **Cristal d'Arques**. **[V]**

Grouped by how they behave in a delivery network — this is the single most important lens for
route planning, because a truck is constrained by **volume and handling crew**, not by order count:

### Class A — Major appliances / white goods
Refrigerators, washing machines, dryers, dishwashers, gas cookers and ranges, built-in ovens,
extractor hoods, air conditioners, large-format TVs.
Brands: Samsung, Ariston, Lofra, Elica, KMG, TCL, Turbo Air. **[V]**

- **0.3 – 1.6 m³ per unit**, 30 – 120 kg
- Needs **2-person crew**, often stairs, often no elevator
- Frequently needs **installation**: plumbing (washer, dishwasher), gas (cooker), electrical,
  wall-mount (TV, hood, split AC)
- **Cannot be re-attempted cheaply.** A failed drop on a fridge costs a full crew-hour plus a
  second trip; a failed drop on a kettle costs almost nothing
- This class is where 100% of the delivery cost problem lives **[I]**

### Class B — Small domestic appliances
Kettles, blenders, food processors, irons, air fryers, coffee machines, personal care.
Brands: Moulinex, Tefal, Krups, BaByliss, JBL. **[V]**

- 0.005 – 0.05 m³, 1 – 8 kg, single-person, no installation
- Can ride as fill in any vehicle, or go via a parcel courier entirely **[I]**

### Class C — Kitchenware, glassware, gifts
Pyrex, Luminarc, Cristal d'Arques, Emsa. **[V]**

- Small, light, **fragile** — the company's own damage policy singles out fragile goods for
  same-day damage reporting **[V]**
- Must not be bottom-stacked under Class A. This is a loading-rule problem, not a routing
  problem **[I]**

**The operational consequence:** these three classes have wildly different cost-to-serve and
should not share a single delivery process. Today it appears they do. **[?]**

---

## 3. Branch network — the origin nodes

Confirmed showroom locations **[V]**:

| Governorate | Branch detail from public listings |
|---|---|
| Hebron (الخليل) | Peace Street, next to Al-Ansar Mosque |
| Bethlehem (بيت لحم) | Al-Jabal Street, Sharia Court building |
| Jerusalem (القدس) | Amr bin Al-Aas Street, near St. George Hotel |
| Ramallah & Al-Bireh (رام الله والبيرة) | Ammar Tower, near Independence Park |
| Nablus (نابلس) | listed |
| Tulkarem (طولكرم) | Nablus Street, Aktaba roundabout |
| Jericho (أريحا) | listed |

The company's campaign copy refers to showrooms **"in all governorates"** (معارض مسلماني هوم في جميع المحافظات),
so the real count is likely higher than the seven above. **[V]/[?]**

Geographically this is a **~135 km north–south corridor** from Jenin down to Hebron, roughly
15–25 km wide, with Jericho hanging off to the east in the Jordan Valley and Jerusalem sitting
inside a separate access regime.

**What we do not know and must ask [?]:**
- Is there a **central distribution centre**, and where? (The group's wholesale arm implies yes.)
- Do branches hold delivery stock, or are they showroom-only with fulfilment from the DC?
- Which branches have a loading dock / yard, and which are street-front only?
- Where does the service centre sit relative to the DC? (Returns and repairs ride the same trucks.)

---

## 4. Sales channels — where orders come from

| Channel | Status | Delivery implication |
|---|---|---|
| **Showroom floor** | Primary **[V]** | Salesperson captures the address verbally. This is the #1 source of bad address data and unrealistic promises **[I]** |
| **Website** `maslamanihome.com` | Live, bilingual `/ar/` + `/en/`, custom PHP (`.php` routes, campaign microsites) — **not** Shopify/Magento **[V]** | Custom stack = we can integrate directly at the DB level, no platform middleware needed. Good news |
| **Campaign microsites** | `/campaigns/ramadan-2025/`, `/campaigns/autumn-2023/`, `/campaigns/number-one/`, `/campaigns/day-by-day-cash/` **[V]** | Campaigns create **demand spikes**. A fleet sized for the mean will fail every Ramadan and every back-to-school **[I]** |
| **Phone / WhatsApp / social** | Active on Facebook, YouTube, X **[V]** | Almost certainly generates orders that never enter a system until a salesperson types them in **[?]** |
| **Bank instalment financing** | *"Easy financing through all major banks"* **[V]** | Paperwork must be complete **before** dispatch, or the driver arrives and cannot release the goods. A classic failed-delivery cause **[I]** |

---

## 5. The delivery promise as it stands today

Straight from the company's own service copy **[V]**:

> **Free delivery within 48 to 72 hours, across the country.**

> **The delivery team will ensure that all free-standing appliances work properly upon delivery,
> installed with the proper set-up related to plumbing and electrical works when needed.**

And the damage-in-delivery policy **[V]**:

> Report damage to Maslamani Home **within 24 hours** of receipt — **same day for fragile items**.
> Product must be unused except for initial testing. All accessories and packaging must be retained.

Three things follow from this, and they define the whole programme:

**1. Delivery is free to the customer, therefore it is 100% margin erosion.**
There is no delivery fee line to hide cost in. Every wasted kilometre, every failed first attempt,
every half-empty truck comes straight off gross margin. This is exactly the pain the client
described. It is also why the fix has to be cost-side, not price-side.

**2. The promise is a 48–72h window, not a slot.**
The client states 48h operationally. A 48h *deadline* with no *slot* is the worst of both worlds:
it gives the planner freedom (good — it means we can consolidate) but gives the customer no
commitment to be home for (bad — it is the direct cause of failed first attempts). The fix is not to
shorten the promise. It is to keep the 48h deadline **and add a confirmed 3–4 hour arrival window
inside it**, agreed with the customer the day before.

**3. The driver is not a driver. He is a technician.**
Plumbing, gas, electrical, wall-mounting, then a functional test in front of the customer. Service
time at the door is not a rounding error — it is 15 to 45 minutes and it dominates the route.
Any optimiser that models "stop time = 5 minutes" will produce a plan that collapses by 11:00.
Ours must model service time **per item, per floor, per installation type**.

---

## 6. Where the cost and the disorganisation actually come from

Based on the above, the cost is not one leak. It is six, and they compound:

| # | Failure mode | Why it happens here | What it costs |
|---|---|---|---|
| 1 | **Failed first attempt** | 48h deadline with no agreed arrival window; customer not home; instalment paperwork incomplete; access not surveyed (4th floor, no elevator, narrow stair) | The most expensive event in the network. Full crew + vehicle round trip, twice, on a Class A item. Industry norm is 10–20% first-attempt failure without windows; with confirmed windows it drops to 3–5% |
| 2 | **Volumetric under-utilisation** | Trucks loaded by order count or by "what's ready", not by m³. A 3-ton truck leaves at 45% cube because three fridges filled the floor and nothing was stacked | Directly doubles cost per drop |
| 3 | **Unconsolidated geography** | Each branch dispatches its own orders to its own customers. Two vans from two branches pass each other on Route 60 serving adjacent villages | 20–35% of kilometres are pure duplication in a branch-siloed network |
| 4 | **Travel time treated as static** | Checkpoint and junction delays on the north–south corridor swing by 20–90 minutes depending on hour and day. A plan built on average travel times is wrong every single morning | Late deliveries, blown SLAs, overtime |
| 5 | **Re-delivery of damaged goods** | Fragile Class C stacked under Class A; no loading sequence discipline; damage discovered at the door | Return leg + replacement leg + margin loss, on top of the 24h damage-claim exposure |
| 6 | **No feedback loop** | No cost-per-drop, no first-attempt-success rate, no drops-per-crew-hour. Nobody can tell which branch, driver or product class is bleeding money | You cannot fix what you cannot see. This is why it feels "unorganised" |

---

## 7. The constraint that makes this different from any off-the-shelf product

This is a West Bank network. Google's routing API, Shopify shipping apps, and every generic
last-mile SaaS will produce **plans that are physically impossible here**. Specifically:

**7.1 Travel time is time-of-day dependent and non-reciprocal.**
The A→B time is not the B→A time, and neither is stable across the day. Checkpoint and junction
queues on the main corridor are the dominant variable. A static distance matrix is not merely
imprecise — it is the wrong model. We need a **time-dependent matrix** with per-arc, per-hour
profiles that the system *learns from its own GPS traces*, which is the only reliable source of
truth for this geography.

**7.2 Access regimes partition the network.**
Jerusalem is not simply "another city on the list". Vehicle plate class and driver permits
determine which vehicles can serve which stops at all. A route that chains a Ramallah drop to a
Jerusalem drop may be undriveable by the assigned vehicle even though it is 15 km.
**In the optimiser this is a hard feasibility constraint, not a cost penalty** — modelled as
zone-eligibility flags on vehicle and driver, checked before any arc is considered.

**7.3 Route topology is corridor-shaped, not grid-shaped.**
Straight-line (haversine) distance badly understates true travel between two points that are close
as the crow flies but separated by terrain or access. Any optimiser using as-the-crow-flies
distances will cluster stops that cannot practically be served together. Road-network distances
are mandatory.

**7.4 The day is short and the exceptions are routine.**
Closures, sudden route changes, and reduced operating hours are not edge cases to be handled by an
ops manager on the phone. They must be **first-class inputs**: a dispatcher toggles an arc or a
zone to "closed / degraded", and the system re-optimises the remaining undelivered stops in seconds.

This is precisely why the answer is a purpose-built system with a pluggable travel-time layer, and
not a licence for a generic route planner.

---

## 8. Discovery list — what to pull the moment we have DB access

Ordered by how much each one changes the design.

**Orders and demand shape**
1. 12 months of order headers: order date, confirmation date, promised date, actual delivery date, origin branch, destination locality, channel, payment type (cash / card / bank instalment)
2. Order lines with product code, quantity, and — critically — **whether product master carries dimensions and weight**. If it does not, that is workstream zero
3. Distribution of orders per day, per branch, and the peak-to-mean ratio around campaigns

**Product master**
4. Product dimensions (L×W×H), weight, packaged cube, fragility flag, installation type required, crew size required. Whatever exists today, plus the gap list

**Network and fleet**
5. Branch list with exact coordinates, dock/yard capability, stock-holding vs showroom-only
6. DC location(s), cross-dock capability, cut-off times
7. Vehicle list: type, payload kg, cargo box internal dimensions (→ usable m³), plate class, ownership (own vs contracted)
8. Driver and crew roster, shift start/end, zone eligibility, installation skills held (gas / plumbing / electrical)

**The truth about today's performance — the baseline we will be measured against**
9. Failed delivery records: count, reason codes if any exist, and re-delivery cost
10. Actual delivery timestamps vs promised — current SLA attainment against the 48h promise
11. Fuel, maintenance, driver cost, and contracted-vehicle cost, per month per branch
12. Damage claims raised under the 24h policy — volume, product class, and root cause where recorded

**Systems**
13. DB engine and version, schema for orders/customers/products/inventory, read-replica availability
14. Whether any GPS/telematics exists on the fleet today, and whether traces are retained
15. SMS / WhatsApp Business API availability for customer notifications
16. What the salesperson sees at point of sale — because that is where the delivery promise is made,
    and it is where our first intervention has to land

---

## 9. Read-through: the strategic conclusion

Maslamani Home is not suffering from a routing problem. It is suffering from a
**promise-and-visibility problem that shows up as a routing cost**.

They promise free delivery in 48h, with installation, across a fragmented and access-constrained
geography, from a branch-siloed network, with no arrival windows, no volumetric load planning,
no time-dependent travel model, and no cost-per-drop measurement.

The routing engine is necessary but it is not where the money is. In order of financial impact:

1. **Confirmed arrival windows** → kills failed first attempts (largest single saving)
2. **Cross-branch consolidation into planned waves** → kills duplicated kilometres
3. **Volumetric load planning with a real cube model** → kills half-empty trucks
4. **Time-dependent, access-aware optimisation** → makes the 48h promise actually hold
5. **Cost-per-drop measurement on every leg** → makes the first four stick, and turns
   "we feel unorganised" into a number that goes down every month

The system we build has to deliver all five. Sections 02 and 03 lay out how.
