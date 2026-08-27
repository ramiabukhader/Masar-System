import type { Locality, Node } from '../core/types';

/**
 * Locality gazetteer. Free-text addresses captured on the showroom floor normalise onto
 * these entries, which is what turns "near the mosque in Beita" into a routable point.
 *
 * Coordinates are approximate town centres, adequate for planning-level demonstration.
 * Production geocodes to the building.
 */
export const LOCALITIES: Locality[] = [
  // --- North corridor ------------------------------------------------------
  { id: 'LOC-JEN', nameAr: 'جنين', nameEn: 'Jenin', governorate: 'Jenin', zone: 'north', location: { lat: 32.4615, lng: 35.2969 } },
  { id: 'LOC-QAB', nameAr: 'قباطية', nameEn: 'Qabatiya', governorate: 'Jenin', zone: 'north', location: { lat: 32.4106, lng: 35.2822 } },
  { id: 'LOC-TBS', nameAr: 'طوباس', nameEn: 'Tubas', governorate: 'Tubas', zone: 'north', location: { lat: 32.3206, lng: 35.3689 } },
  { id: 'LOC-TUL', nameAr: 'طولكرم', nameEn: 'Tulkarem', governorate: 'Tulkarem', zone: 'north', location: { lat: 32.3104, lng: 35.0286 } },
  { id: 'LOC-ANB', nameAr: 'عنبتا', nameEn: 'Anabta', governorate: 'Tulkarem', zone: 'north', location: { lat: 32.3081, lng: 35.1147 } },
  { id: 'LOC-QLQ', nameAr: 'قلقيلية', nameEn: 'Qalqilya', governorate: 'Qalqilya', zone: 'north', location: { lat: 32.1896, lng: 34.9706 } },
  { id: 'LOC-AZN', nameAr: 'عزون', nameEn: 'Azzun', governorate: 'Qalqilya', zone: 'north', location: { lat: 32.175, lng: 35.05 } },
  { id: 'LOC-NAB', nameAr: 'نابلس', nameEn: 'Nablus', governorate: 'Nablus', zone: 'north', location: { lat: 32.2211, lng: 35.2544 } },
  { id: 'LOC-HWR', nameAr: 'حوارة', nameEn: 'Huwara', governorate: 'Nablus', zone: 'north', location: { lat: 32.1533, lng: 35.2517 } },
  { id: 'LOC-BEI', nameAr: 'بيتا', nameEn: 'Beita', governorate: 'Nablus', zone: 'north', location: { lat: 32.14, lng: 35.2833 } },
  { id: 'LOC-SLF', nameAr: 'سلفيت', nameEn: 'Salfit', governorate: 'Salfit', zone: 'north', location: { lat: 32.0847, lng: 35.1811 } },
  { id: 'LOC-JMN', nameAr: 'جماعين', nameEn: "Jamma'in", governorate: 'Nablus', zone: 'north', location: { lat: 32.1333, lng: 35.1667 } },

  // --- Central -------------------------------------------------------------
  { id: 'LOC-RAM', nameAr: 'رام الله', nameEn: 'Ramallah', governorate: 'Ramallah & Al-Bireh', zone: 'central', location: { lat: 31.9038, lng: 35.2034 } },
  { id: 'LOC-BIR', nameAr: 'البيرة', nameEn: 'Al-Bireh', governorate: 'Ramallah & Al-Bireh', zone: 'central', location: { lat: 31.9073, lng: 35.2158 } },
  { id: 'LOC-BTN', nameAr: 'بيتونيا', nameEn: 'Beitunia', governorate: 'Ramallah & Al-Bireh', zone: 'central', location: { lat: 31.8944, lng: 35.1667 } },
  { id: 'LOC-BZT', nameAr: 'بيرزيت', nameEn: 'Birzeit', governorate: 'Ramallah & Al-Bireh', zone: 'central', location: { lat: 31.9714, lng: 35.1908 } },
  { id: 'LOC-SLW', nameAr: 'سلواد', nameEn: 'Silwad', governorate: 'Ramallah & Al-Bireh', zone: 'central', location: { lat: 31.9833, lng: 35.2833 } },
  { id: 'LOC-NLN', nameAr: 'نعلين', nameEn: "Ni'lin", governorate: 'Ramallah & Al-Bireh', zone: 'central', location: { lat: 31.9333, lng: 35.0 } },
  { id: 'LOC-RAMM', nameAr: 'الرام', nameEn: 'Ar-Ram', governorate: 'Jerusalem', zone: 'central', location: { lat: 31.8394, lng: 35.2333 } },

  // --- Jordan Valley -------------------------------------------------------
  { id: 'LOC-JRC', nameAr: 'أريحا', nameEn: 'Jericho', governorate: 'Jericho', zone: 'jordan_valley', location: { lat: 31.8667, lng: 35.45 } },
  { id: 'LOC-AUJ', nameAr: 'العوجا', nameEn: 'Al-Auja', governorate: 'Jericho', zone: 'jordan_valley', location: { lat: 31.95, lng: 35.4667 } },

  // --- Jerusalem access regime --------------------------------------------
  { id: 'LOC-JRS', nameAr: 'القدس', nameEn: 'Jerusalem', governorate: 'Jerusalem', zone: 'jerusalem', location: { lat: 31.7887, lng: 35.229 } },
  { id: 'LOC-BTH', nameAr: 'بيت حنينا', nameEn: 'Beit Hanina', governorate: 'Jerusalem', zone: 'jerusalem', location: { lat: 31.8261, lng: 35.2244 } },
  { id: 'LOC-ABD', nameAr: 'أبو ديس', nameEn: 'Abu Dis', governorate: 'Jerusalem', zone: 'jerusalem', location: { lat: 31.7628, lng: 35.265 } },
  { id: 'LOC-EIZ', nameAr: 'العيزرية', nameEn: 'Al-Eizariya', governorate: 'Jerusalem', zone: 'jerusalem', location: { lat: 31.7714, lng: 35.2617 } },

  // --- South corridor ------------------------------------------------------
  { id: 'LOC-BET', nameAr: 'بيت لحم', nameEn: 'Bethlehem', governorate: 'Bethlehem', zone: 'south', location: { lat: 31.7054, lng: 35.2024 } },
  { id: 'LOC-BJL', nameAr: 'بيت جالا', nameEn: 'Beit Jala', governorate: 'Bethlehem', zone: 'south', location: { lat: 31.7156, lng: 35.1878 } },
  { id: 'LOC-BSH', nameAr: 'بيت ساحور', nameEn: 'Beit Sahour', governorate: 'Bethlehem', zone: 'south', location: { lat: 31.7, lng: 35.225 } },
  { id: 'LOC-HEB', nameAr: 'الخليل', nameEn: 'Hebron', governorate: 'Hebron', zone: 'south', location: { lat: 31.5326, lng: 35.0998 } },
  { id: 'LOC-HLH', nameAr: 'حلحول', nameEn: 'Halhul', governorate: 'Hebron', zone: 'south', location: { lat: 31.5806, lng: 35.0989 } },
  { id: 'LOC-DUR', nameAr: 'دورا', nameEn: 'Dura', governorate: 'Hebron', zone: 'south', location: { lat: 31.5083, lng: 35.0269 } },
  { id: 'LOC-YTA', nameAr: 'يطا', nameEn: 'Yatta', governorate: 'Hebron', zone: 'south', location: { lat: 31.4472, lng: 35.0906 } },
  { id: 'LOC-BNM', nameAr: 'بني نعيم', nameEn: "Bani Na'im", governorate: 'Hebron', zone: 'south', location: { lat: 31.5183, lng: 35.1656 } },
  { id: 'LOC-TRQ', nameAr: 'ترقوميا', nameEn: 'Tarqumiya', governorate: 'Hebron', zone: 'south', location: { lat: 31.5806, lng: 35.0028 } },
];

/**
 * Network nodes.
 *
 * Branch locations are the publicly listed Maslamani Home showrooms (docs/01 §3).
 * The central distribution centre is an ASSUMPTION pending discovery — the group's
 * wholesale arm strongly implies one exists, but its location must be confirmed.
 */
export const NODES: Node[] = [
  { id: 'DC-CENTRAL', nameAr: 'المركز الرئيسي للتوزيع', nameEn: 'Central Distribution Centre', kind: 'dc', zone: 'central', location: { lat: 31.915, lng: 35.23 }, localityId: 'LOC-BIR', hasDock: true, holdsStock: true },
  { id: 'BR-RAM', nameAr: 'معرض رام الله والبيرة', nameEn: 'Ramallah & Al-Bireh Showroom', kind: 'branch', zone: 'central', location: { lat: 31.9038, lng: 35.2034 }, localityId: 'LOC-RAM', hasDock: false, holdsStock: true },
  { id: 'BR-NAB', nameAr: 'معرض نابلس', nameEn: 'Nablus Showroom', kind: 'branch', zone: 'north', location: { lat: 32.2211, lng: 35.2544 }, localityId: 'LOC-NAB', hasDock: true, holdsStock: true },
  { id: 'BR-TUL', nameAr: 'معرض طولكرم', nameEn: 'Tulkarem Showroom', kind: 'branch', zone: 'north', location: { lat: 32.3104, lng: 35.0286 }, localityId: 'LOC-TUL', hasDock: false, holdsStock: true },
  { id: 'BR-HEB', nameAr: 'معرض الخليل', nameEn: 'Hebron Showroom', kind: 'branch', zone: 'south', location: { lat: 31.5326, lng: 35.0998 }, localityId: 'LOC-HEB', hasDock: true, holdsStock: true },
  { id: 'BR-BET', nameAr: 'معرض بيت لحم', nameEn: 'Bethlehem Showroom', kind: 'branch', zone: 'south', location: { lat: 31.7054, lng: 35.2024 }, localityId: 'LOC-BET', hasDock: false, holdsStock: true },
  { id: 'BR-JRS', nameAr: 'معرض القدس', nameEn: 'Jerusalem Showroom', kind: 'branch', zone: 'jerusalem', location: { lat: 31.7887, lng: 35.229 }, localityId: 'LOC-JRS', hasDock: false, holdsStock: true },
  { id: 'BR-JRC', nameAr: 'معرض أريحا', nameEn: 'Jericho Showroom', kind: 'branch', zone: 'jordan_valley', location: { lat: 31.8667, lng: 35.45 }, localityId: 'LOC-JRC', hasDock: false, holdsStock: true },
];

/**
 * Nodes that can stage a consolidated corridor load overnight. The Jerusalem and Jericho
 * branches are included because their sub-fleets are homed there — stock for those zones
 * rides the overnight shuttle to the branch rather than being trucked out each morning.
 */
export const HUB_NODE_IDS = ['DC-CENTRAL', 'BR-NAB', 'BR-HEB', 'BR-JRS', 'BR-JRC'];

export const LOCALITY_MAP = new Map(LOCALITIES.map((l) => [l.id, l]));
export const NODE_MAP = new Map(NODES.map((n) => [n.id, n]));
