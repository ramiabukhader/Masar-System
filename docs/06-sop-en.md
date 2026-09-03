# 06 — Standard Operating Procedures (English)

**Masar delivery operation — from the sale to the closed, costed delivery.**
Arabic version: `docs/07-sop-ar.md`. In-app version: the **Process Guide** tab.

These three must always say the same thing. When a process changes, change all three.

---

## 1. Scope and principles

Covers every delivery from a showroom, the website, or the call centre to a
customer address, including installation and payment collection.

Five principles, in priority order:

1. **The customer's promised window is a commitment.** Everything else in the day flexes
   around it.
2. **Bad data never reaches a truck.** An unresolved address or an incomplete instalment
   file is a task for a person, not a wasted trip for a crew.
3. **Every exception gets a code.** Free-text notes vanish; codes get counted and fixed.
4. **Safety and certification are never traded against time.** No gas work by an
   uncertified crew, no overloaded vehicle, no unsafe carry.
5. **Nobody is punished for reporting a problem early.** Early reporting is the cheapest
   thing in the network; hiding a problem until 16:00 is the most expensive.

---

## 2. Roles

| Role | Owns | Screen |
|---|---|---|
| **Salesperson** | Correct address, access survey, realistic expectation | Intake form / POS prompt |
| **Call centre agent** | Address confirmation, window confirmation, reschedules | Confirmation queue |
| **Delivery Planner** | Runs the wave, approves the plan, sets closure flags | Control Tower — Plan |
| **Branch / DC Supervisor** | Picking, staging, load verification | Branch Ops |
| **Driver / Installer crew** | The drop, the install, the POD, the cash | Driver App |
| **Dispatcher (Control Tower)** | Live exceptions, re-planning, customer comms | Control Tower — Live |
| **Service Centre** | Damage follow-up, faults, return legs | Exception queue |
| **Finance** | Daily cash and instalment reconciliation | Reconciliation report |

---

## 3. Daily timetable

| Time | Who | What |
|---|---|---|
| **All day** | Sales, web, call centre | Orders captured with access survey |
| **15:30** | Planner | Clear the data-gate queue: unresolved addresses, uncleared instalments |
| **16:00** | Planner | **Run the wave.** Review, adjust, approve |
| **16:30** | System + call centre | Send D-1 window confirmations; call the non-responders |
| **17:30** | Planner | Final plan locked; pick lists and manifests released to branches |
| **20:00** | Shuttle | Overnight inter-branch transfers depart |
| **06:00** | Shuttle | Transfers land at staging points |
| **06:30** | Supervisor | Pick and stage on the dock |
| **07:00** | Crews | Load, verify, depart |
| **07:00–17:00** | Crews + Dispatcher | Execute; exceptions handled live |
| **17:00–18:00** | Drivers + Finance | Return, hand over cash, reconcile |
| **18:00** | System | Close out; write back statuses; compute the day's cost per drop |

---

## PART A — Order to plan

### A1. Take the sale (Salesperson)

1. Capture the customer's **name, mobile number and address**. The mobile must be one that
   receives SMS/WhatsApp — the window confirmation goes there.
2. Pick the **locality from the list**. Do not free-type a town name.
3. Add a landmark: *"behind the school"*, *"above the pharmacy"*. Landmarks are what
   actually find the building here.
4. **Take the access survey. This is mandatory for any major appliance:**
   - Which floor?
   - Is there an elevator? **Will a boxed appliance fit in it?**
   - Are the stairs narrow or turning?
   - Can a truck park near the entrance?
   - For a washer/dishwasher: is there a water connection and a drain?
   - For a cooker: is there a gas connection, and is it bottled or piped?
5. Tell the customer: *"We deliver within 48 hours. Tomorrow we will send you a message
   with a three-hour window — please confirm it or choose another."*

> **Never promise a specific hour on the showroom floor.** The window is produced by the
> plan, and the plan does not exist yet. A promise made here that the plan cannot keep is
> a failed delivery you have already scheduled.

### A2. Payment and instalments (Salesperson → Finance)

- Cash or card: nothing more to do.
- **Bank instalment: the file must be complete before the order can be planned.** The SLA
  clock keeps running while it is incomplete, so chase it the same day. An incomplete file
  means the crew arrives and cannot hand over the goods.

### A3. Data gate (System → Call centre)

The system holds an order out of planning when any of these fail:

| Gate | Held because | Who clears it |
|---|---|---|
| Address resolved | Geocode confidence too low | Call centre — call and confirm the landmark |
| Phone valid | Not a reachable mobile | Call centre |
| Cube known | Product has no dimensions | Planner — uses the category default and flags the manifest |
| Payment cleared | Instalment file incomplete | Sales / Finance |
| Stock available | Not at any node in time | Planner — arrange the transfer or contact the customer |

**Clear this queue by 15:30 every day.** Anything still held at 16:00 misses the wave.

### A4. Run the wave (Planner, 16:00)

1. Open **Control Tower → Plan**. Run the wave.
2. Review the summary: routes, drops, cost per drop, vehicle fill, SLA at risk.
3. Read the **unassigned list**. Each entry states its reason. Act on it:
   - *No capacity left* → add a vehicle, or move the least urgent stops to tomorrow while
     they still have SLA slack.
   - *No eligible vehicle* → a zone or skill gap. Reassign a driver or escalate.
   - *Route blocked* → confirm the closure, then re-run.
4. Check any stop flagged **SLA at risk** (under 90 minutes of slack). If a route is
   fragile, move a stop rather than hope.
5. Approve. Pick lists and loading manifests release to the branches.

---

## PART B — Plan to truck

### B1. Pick (Branch / DC Supervisor, from 06:30)

1. Open **Branch Ops** and select the route by vehicle plate.
2. Pick from the **pick list** — one consolidated list per route.
3. Check every item against its packaging: no dents, no crushed corners, seals intact.
   **A damaged box does not go on the truck.** Replace it now; discovering it at the
   customer's door costs a whole trip.
4. Items flagged *estimated dimensions* have no measured cube. Look at them: if the real
   item is clearly larger than the plan assumes, tell the Planner before loading.

### B2. Stage and load (Supervisor + crew, from 07:00)

1. Lay the shipments out on the dock **in loading order** before opening the truck.
2. Load **strictly by the manifest sequence**. The manifest is in reverse delivery order:
   **load number 1 is the last drop of the day.**
3. Respect the position column:
   - *Box front (deepest)* — first in, last out
   - *Box middle*
   - *Box rear (at the door)* — the first drops of the day
   - *Top shelf* — **all fragile glassware and tableware. Never on the floor, never under
     an appliance.**
4. Scan each item to verify. The manifest must reach 100% before departure.
5. Secure the load: straps on every major appliance, upright where the manufacturer
   requires it, nothing resting on a fragile carton.

> **Why the sequence matters:** loading in delivery order instead of reverse order means
> the crew unloads half the truck at every stop. That is where the lost hours and most of
> the damage come from.

### B3. Departure check (Driver)

- [ ] Piece count matches the manifest
- [ ] Manifest scan is at 100%
- [ ] Installation tools on board: gas fittings, water hoses, drill and anchors, level,
      test leads
- [ ] Trolley, straps, blankets, floor protection
- [ ] Phone charged, **Driver App opened once so the route is downloaded for offline use**
- [ ] Cash float and receipt book
- [ ] Vehicle check: tyres, lights, fuel, load secured

---

## PART C — Truck to door

### C1. Drive the planned sequence (Driver)

- **Follow the sequence in the app.** It is computed against travel times that change by
  hour. Reordering it by hand breaks windows already promised to customers further down
  the route.
- If you are running more than **20 minutes behind**, report it from the app immediately.
  The Control Tower re-computes and warns the affected customers. Twenty minutes reported
  at 09:00 is a message; two hours discovered at 15:00 is four failed deliveries.
- If a route is closed or a junction is blocked, report it with the **route_blocked** code
  and follow the Dispatcher's instruction. Do not improvise a long detour without telling
  the Control Tower — the rest of the plan depends on where you are.

### C2. Pre-arrival call (Driver, 15–20 minutes out)

*"Good morning, this is the Masar delivery team. We are 20 minutes away with your [item].
Is someone at the address? Is the stairway clear?"*

If nobody will be there → do not drive to the address. Report **customer_absent** from the
app now, so the Dispatcher can attempt a reschedule while you continue to the next stop.

### C3. Arrive and check access (Crew)

1. Park as close to the entrance as is safe and legal.
2. **Before lifting anything: measure.** Doorway width, stair width, turns, lift interior.
3. If it will not fit: **stop**. Photograph the obstruction, report **does_not_fit**, and
   let the Control Tower speak to the customer. Do not attempt a forced carry — that is
   how people and products get damaged.

### C4. Unload and inspect with the customer (Crew)

1. Bring the item in and open the packaging **in front of the customer**.
2. Inspect together: dents, scratches, cracked glass, missing accessories.
3. If there is damage: photograph it, report **damaged_in_transit**, and do not install.
   Ask the customer whether they want a replacement delivery or a refund, and record it.

> Company policy gives the customer **24 hours to report damage, same day for fragile
> items**. Inspecting together at the door settles the question before it becomes a dispute.

### C5. Position and install (Crew)

1. Place the appliance in its final position and level it.
2. Complete the installation **within your certification**:
   - **Water** (washer, dishwasher): connect inlet and drain, open the tap, check for leaks
     at both ends, run for two minutes.
   - **Gas** (cooker): connect the regulator, **leak-test every joint with soapy water**,
     light every burner, check the flame.
   - **Electrical**: verify the socket rating, no extension leads for major appliances,
     confirm earthing.
   - **Wall-mount** (TV, hood, split AC): find the structural fixing, use the correct
     anchors, check level and load.
3. **If the installation cannot be completed** — no gas point, no drain, unsafe wiring, wall
   will not hold — report **install_not_possible**, explain it to the customer, leave the
   appliance safely in place, and let the Service Centre schedule the follow-up.

> **Gas work is done only by a certified crew.** The system will not assign a gas job to
> anyone else. Never do one as a favour.

### C6. Functional test (Crew)

Power the appliance up and demonstrate that it works, with the customer watching. This is a
promise the company advertises, not an optional step. Show the basics: how to start it,
what the main settings do, where the filter is.

---

## PART D — Door to close

### D1. Proof of delivery (Crew)

- [ ] Photos: item in its final position, and any installed connection
- [ ] Functional test confirmed in the app
- [ ] Per-item outcome: accepted / damaged / refused
- [ ] Receiver's name and signature
- [ ] Notes if anything is unusual

### D2. Payment (Crew)

1. Collect the amount shown in the app — never a different figure.
2. Record it in the app **immediately**, before leaving.
3. Issue the receipt.
4. If the customer cannot pay: do not hand over the goods. Report **payment_not_ready**,
   bring the item back, and let the Control Tower arrange redelivery.

### D3. Packaging (Crew)

Take the packaging away unless the customer asks to keep it — reminding them that the
returns policy requires the packaging to be retained if they may want to return the item.

### D4. Exception playbook

Report from the app, always with a code.

| Code | Meaning | Crew does | Control Tower does | Target |
|---|---|---|---|---|
| `customer_absent` | Nobody at the address | Wait 10 min, call twice, report | Attempt same-day reschedule, else next wave | Retry within 24h |
| `address_wrong` | Address does not exist / wrong | Photograph the location, report | Call customer, correct the record, re-plan | Same day |
| `access_blocked` | Cannot reach the entrance | Report with photo | Agree an alternative with the customer | Same day |
| `does_not_fit` | Will not pass the access | **Do not force it.** Photo + report | Offer alternative model, crane/hoist, or refund | 48h decision |
| `damaged_in_transit` | Damage found at the door | Photo, do not install, report | Raise replacement, notify Service Centre | Replacement within 48h |
| `payment_not_ready` | Customer cannot pay | Do not release goods, return item | Contact customer, re-schedule when cleared | 48h |
| `customer_refused` | Customer refuses the item | Record the reason, return item | Sales follow-up, returns process | 24h contact |
| `install_not_possible` | Site not ready or unsafe | Leave item safe, report | Service Centre schedules a return visit | 72h |
| `route_blocked` | Road/crossing closed | Report, await instruction | Re-plan remaining stops, notify customers | Immediate |
| `vehicle_breakdown` | Vehicle out of service | Secure the load, report | Dispatch replacement, re-plan | Immediate |
| `out_of_time` | Shift will expire before the stop | Report before it happens | Move to next wave, notify customer | Before shift end |

### D5. Return and reconcile (Driver + Finance)

1. Return refused, damaged and undelivered items to the dock, each with its exception code.
2. Hand over collected cash. Finance reconciles against the app record **per driver, per
   day** — no exceptions, no next-morning settlements.
3. Report any vehicle fault before leaving.

### D6. Close out (System, 18:00)

Delivery status is written back to the commerce database. The day's numbers are computed:
cost per drop, first-attempt success, SLA attainment, vehicle fill, exceptions by code.

---

## 4. Escalation matrix

| Situation | First | Then | Within |
|---|---|---|---|
| Running >20 min late | Dispatcher (via app) | Planner | Immediately |
| Stop cannot be completed | Dispatcher | Branch supervisor | Before leaving the address |
| Route/crossing closed | Dispatcher | Planner | Immediately |
| Vehicle breakdown | Dispatcher | Fleet supervisor | Immediately |
| Customer dispute or complaint | Dispatcher | Branch manager | Same day |
| Damage claim | Service Centre | Branch manager | 24h |
| Injury or safety incident | **Stop work.** Supervisor | Management | Immediately |

---

## 5. Measurement and review

| KPI | Target | Reviewed |
|---|---|---|
| Cost per drop | −25 to −35% vs baseline | Weekly |
| First-attempt success | ≥ 95% | Daily |
| SLA attainment (48h) | ≥ 97% | Daily |
| Vehicle cube fill | ≥ 75% | Weekly |
| Drops per crew-hour | +30% vs baseline | Weekly |
| Damage rate | −50% vs baseline | Monthly |
| Plan stability (delivered in planned sequence) | ≥ 90% | Weekly |

- **Daily, 08:30 (15 min):** yesterday's exceptions by code, today's SLA risks.
- **Weekly:** cost per drop by branch, driver and product class. Top three exception codes
  and what is being done about each.
- **Monthly:** fleet sizing, tuning parameters, damage root causes, product-master gaps
  found in the field.

---

## 6. Driver quick card

**Before you leave**
Manifest 100% scanned · tools on board · phone charged and route downloaded · cash float

**On the road**
Follow the app's sequence · report >20 min delay immediately · never improvise a long detour silently

**At every stop**
Call 20 min ahead → measure the access before lifting → open and inspect **with the
customer** → position and install → **run the test in front of them** → photos + signature
→ collect and record payment → take the packaging

**When something is wrong**
**Stop. Photograph. Report with the code.** Never force a carry. Never do gas work you are
not certified for. Never leave goods without payment when payment is due.

**Reporting early is always right.**
