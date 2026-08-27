import type { Driver, Vehicle } from '../core/types';

/**
 * Fleet. Costs are ILS (₪): costPerKm covers fuel, tyres and wear; costPerHour covers
 * crew wages; fixedCost is what it costs to put the vehicle on the road at all — that
 * last number is what drives consolidation, because it makes a half-empty truck visibly
 * expensive to the optimiser.
 *
 * capacityM3 is USABLE cube, already derated from internal box volume for the reality of
 * stacking boxed white goods. Planning against nominal volume is how trucks end up
 * "full" at 60%.
 *
 * Jerusalem-eligible vehicles are a separate sub-fleet (docs/02 §2.3). Eligibility is a
 * hard constraint in the optimiser, so a plan physically cannot assign a Jerusalem stop
 * to a vehicle that may not serve it.
 */
export const VEHICLES: Vehicle[] = [
  // --- Corridor trucks: major appliances -----------------------------------
  { id: 'VEH-T1', plate: 'T-4471', type: 'truck_3t', capacityM3: 18, capacityKg: 3000, crewSize: 2, eligibleZones: ['central', 'north', 'south', 'jordan_valley'], homeNodeId: 'DC-CENTRAL', costPerKm: 2.6, costPerHour: 75, fixedCost: 320, canCarryClassA: true },
  { id: 'VEH-T2', plate: 'T-4482', type: 'truck_3t', capacityM3: 18, capacityKg: 3000, crewSize: 2, eligibleZones: ['central', 'north', 'south', 'jordan_valley'], homeNodeId: 'DC-CENTRAL', costPerKm: 2.6, costPerHour: 75, fixedCost: 320, canCarryClassA: true },
  { id: 'VEH-T3', plate: 'T-5510', type: 'truck_3t', capacityM3: 16, capacityKg: 2800, crewSize: 2, eligibleZones: ['north', 'central'], homeNodeId: 'BR-NAB', costPerKm: 2.5, costPerHour: 72, fixedCost: 300, canCarryClassA: true },
  { id: 'VEH-T4', plate: 'T-5523', type: 'truck_3t', capacityM3: 16, capacityKg: 2800, crewSize: 2, eligibleZones: ['south', 'central'], homeNodeId: 'BR-HEB', costPerKm: 2.5, costPerHour: 72, fixedCost: 300, canCarryClassA: true },

  // --- Large vans: mixed loads with installation ---------------------------
  { id: 'VEH-L1', plate: 'V-2231', type: 'van_large', capacityM3: 9, capacityKg: 1200, crewSize: 2, eligibleZones: ['central', 'north', 'south', 'jordan_valley'], homeNodeId: 'DC-CENTRAL', costPerKm: 1.8, costPerHour: 62, fixedCost: 210, canCarryClassA: true },
  { id: 'VEH-L2', plate: 'V-2245', type: 'van_large', capacityM3: 9, capacityKg: 1200, crewSize: 2, eligibleZones: ['central', 'south'], homeNodeId: 'DC-CENTRAL', costPerKm: 1.8, costPerHour: 62, fixedCost: 210, canCarryClassA: true },
  { id: 'VEH-L3', plate: 'V-3390', type: 'van_large', capacityM3: 9, capacityKg: 1200, crewSize: 2, eligibleZones: ['north'], homeNodeId: 'BR-NAB', costPerKm: 1.8, costPerHour: 62, fixedCost: 210, canCarryClassA: true },

  // --- Small vans: Class B/C only, single crew, cheapest per drop -----------
  { id: 'VEH-S1', plate: 'S-1102', type: 'van_small', capacityM3: 3.5, capacityKg: 800, crewSize: 1, eligibleZones: ['central', 'north', 'south'], homeNodeId: 'DC-CENTRAL', costPerKm: 1.2, costPerHour: 40, fixedCost: 130, canCarryClassA: false },
  { id: 'VEH-S2', plate: 'S-1118', type: 'van_small', capacityM3: 3.5, capacityKg: 800, crewSize: 1, eligibleZones: ['central', 'jordan_valley'], homeNodeId: 'DC-CENTRAL', costPerKm: 1.2, costPerHour: 40, fixedCost: 130, canCarryClassA: false },
  { id: 'VEH-S3', plate: 'S-1204', type: 'van_small', capacityM3: 3.5, capacityKg: 800, crewSize: 1, eligibleZones: ['south'], homeNodeId: 'BR-HEB', costPerKm: 1.2, costPerHour: 40, fixedCost: 130, canCarryClassA: false },

  // --- Jerusalem sub-fleet: separate access regime -------------------------
  { id: 'VEH-J1', plate: 'J-8830', type: 'van_large', capacityM3: 9, capacityKg: 1200, crewSize: 2, eligibleZones: ['jerusalem'], homeNodeId: 'BR-JRS', costPerKm: 2.1, costPerHour: 68, fixedCost: 240, canCarryClassA: true },
  { id: 'VEH-J2', plate: 'J-8841', type: 'van_small', capacityM3: 3.5, capacityKg: 800, crewSize: 1, eligibleZones: ['jerusalem'], homeNodeId: 'BR-JRS', costPerKm: 1.4, costPerHour: 45, fixedCost: 150, canCarryClassA: false },

  // --- Jordan Valley -------------------------------------------------------
  { id: 'VEH-P1', plate: 'P-6612', type: 'pickup', capacityM3: 5, capacityKg: 1000, crewSize: 2, eligibleZones: ['jordan_valley', 'central'], homeNodeId: 'BR-JRC', costPerKm: 1.4, costPerHour: 45, fixedCost: 150, canCarryClassA: true },
];

const SHIFT_START = 7 * 60; // 07:00
const SHIFT_END = 17 * 60; // 17:00

/**
 * Crews. `skills` gates which installations a crew may perform — a gas cooker cannot be
 * assigned to a crew without the gas certification, and the optimiser enforces that
 * rather than trusting anyone to remember it.
 */
export const DRIVERS: Driver[] = [
  { id: 'DRV-01', name: 'Ahmad Odeh', nameAr: 'أحمد عودة', skills: ['plumbing', 'gas', 'electrical', 'mount'], eligibleZones: ['central', 'north', 'south', 'jordan_valley'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-T1' },
  { id: 'DRV-02', name: 'Mahmoud Salah', nameAr: 'محمود صلاح', skills: ['plumbing', 'electrical', 'mount'], eligibleZones: ['central', 'north', 'south', 'jordan_valley'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-T2' },
  { id: 'DRV-03', name: 'Yousef Haddad', nameAr: 'يوسف حداد', skills: ['plumbing', 'gas', 'electrical', 'mount'], eligibleZones: ['north', 'central'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-T3' },
  { id: 'DRV-04', name: 'Sami Qawasmi', nameAr: 'سامي القواسمي', skills: ['plumbing', 'gas', 'electrical', 'mount'], eligibleZones: ['south', 'central'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-T4' },
  { id: 'DRV-05', name: 'Rami Nasser', nameAr: 'رامي ناصر', skills: ['plumbing', 'electrical', 'mount'], eligibleZones: ['central', 'north', 'south', 'jordan_valley'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-L1' },
  { id: 'DRV-06', name: 'Khaled Dweik', nameAr: 'خالد الدويك', skills: ['plumbing', 'gas', 'mount'], eligibleZones: ['central', 'south'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-L2' },
  { id: 'DRV-07', name: 'Nidal Shakhshir', nameAr: 'نضال شخشير', skills: ['plumbing', 'electrical', 'mount'], eligibleZones: ['north'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-L3' },
  { id: 'DRV-08', name: 'Basel Amro', nameAr: 'باسل عمرو', skills: [], eligibleZones: ['central', 'north', 'south'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-S1' },
  { id: 'DRV-09', name: 'Tareq Jaber', nameAr: 'طارق جابر', skills: [], eligibleZones: ['central', 'jordan_valley'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-S2' },
  { id: 'DRV-10', name: 'Omar Tamimi', nameAr: 'عمر التميمي', skills: [], eligibleZones: ['south'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-S3' },
  { id: 'DRV-11', name: 'Issa Sabbah', nameAr: 'عيسى صباح', skills: ['plumbing', 'gas', 'electrical', 'mount'], eligibleZones: ['jerusalem'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-J1' },
  { id: 'DRV-12', name: 'Fadi Zahran', nameAr: 'فادي زهران', skills: [], eligibleZones: ['jerusalem'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-J2' },
  { id: 'DRV-13', name: 'Munther Erekat', nameAr: 'منذر عريقات', skills: ['plumbing', 'electrical', 'mount'], eligibleZones: ['jordan_valley', 'central'], shiftStartMin: SHIFT_START, shiftEndMin: SHIFT_END, defaultVehicleId: 'VEH-P1' },
];

export const VEHICLE_MAP = new Map(VEHICLES.map((v) => [v.id, v]));
export const DRIVER_MAP = new Map(DRIVERS.map((d) => [d.id, d]));
