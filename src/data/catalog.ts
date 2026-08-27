import type { Product } from '../core/types';

/**
 * Product catalogue modelled on Maslamani Home's actual brand portfolio (docs/01 §2):
 * KMG, Samsung, TCL, Ariston, Lofra, Elica, Turbo Air, JBL, Moulinex, Tefal, Krups,
 * BaByliss, Emsa, Pyrex, Luminarc, Cristal d'Arques.
 *
 * Cube, weight, crew and installation figures are representative of the packaged goods.
 * In production these come from the product master — and where they are missing, that is
 * workstream zero (docs/04 §4). Anything derived rather than measured is flagged
 * `dimensionsEstimated`, which surfaces on the manifest so the crew is not surprised.
 *
 * Prices are in ILS (₪), the working currency of the market.
 */
export const PRODUCTS: Product[] = [
  // --- Class A: major appliances ------------------------------------------
  { sku: 'SAM-RF-SBS-620', nameAr: 'ثلاجة سامسونج جنباً إلى جنب ٦٢٠ لتر', nameEn: 'Samsung Side-by-Side Refrigerator 620L', brand: 'Samsung', category: 'refrigerator', productClass: 'A', cubeM3: 1.42, weightKg: 118, fragile: false, stackable: false, installType: 'plumbing', crewRequired: 2, handlingMinutes: 14, installMinutes: 20, dimensionsEstimated: false },
  { sku: 'SAM-RF-TM-390', nameAr: 'ثلاجة سامسونج بابين ٣٩٠ لتر', nameEn: 'Samsung Top-Mount Refrigerator 390L', brand: 'Samsung', category: 'refrigerator', productClass: 'A', cubeM3: 0.98, weightKg: 74, fragile: false, stackable: false, installType: 'none', crewRequired: 2, handlingMinutes: 12, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'KMG-RF-310', nameAr: 'ثلاجة KMG ٣١٠ لتر', nameEn: 'KMG Refrigerator 310L', brand: 'KMG', category: 'refrigerator', productClass: 'A', cubeM3: 0.88, weightKg: 68, fragile: false, stackable: false, installType: 'none', crewRequired: 2, handlingMinutes: 12, installMinutes: 0, dimensionsEstimated: true },
  { sku: 'TUR-FZ-CH-300', nameAr: 'فريزر أفقي توربو أير ٣٠٠ لتر', nameEn: 'Turbo Air Chest Freezer 300L', brand: 'Turbo Air', category: 'freezer', productClass: 'A', cubeM3: 0.85, weightKg: 65, fragile: false, stackable: false, installType: 'none', crewRequired: 2, handlingMinutes: 11, installMinutes: 0, dimensionsEstimated: true },
  { sku: 'SAM-WM-8KG', nameAr: 'غسالة سامسونج ٨ كغم', nameEn: 'Samsung Washing Machine 8kg', brand: 'Samsung', category: 'washer', productClass: 'A', cubeM3: 0.42, weightKg: 66, fragile: false, stackable: false, installType: 'plumbing', crewRequired: 2, handlingMinutes: 10, installMinutes: 22, dimensionsEstimated: false },
  { sku: 'ARI-WM-9KG', nameAr: 'غسالة أريستون ٩ كغم', nameEn: 'Ariston Washing Machine 9kg', brand: 'Ariston', category: 'washer', productClass: 'A', cubeM3: 0.44, weightKg: 70, fragile: false, stackable: false, installType: 'plumbing', crewRequired: 2, handlingMinutes: 10, installMinutes: 22, dimensionsEstimated: false },
  { sku: 'ARI-DW-14', nameAr: 'جلاية أريستون ١٤ فرد', nameEn: 'Ariston Dishwasher 14 Place', brand: 'Ariston', category: 'dishwasher', productClass: 'A', cubeM3: 0.4, weightKg: 48, fragile: false, stackable: false, installType: 'plumbing', crewRequired: 2, handlingMinutes: 9, installMinutes: 25, dimensionsEstimated: false },
  { sku: 'SAM-DR-8KG', nameAr: 'نشافة سامسونج ٨ كغم', nameEn: 'Samsung Dryer 8kg', brand: 'Samsung', category: 'dryer', productClass: 'A', cubeM3: 0.42, weightKg: 58, fragile: false, stackable: false, installType: 'electrical', crewRequired: 2, handlingMinutes: 10, installMinutes: 15, dimensionsEstimated: false },
  { sku: 'LOF-CK-90', nameAr: 'غاز لوفرا ٩٠ سم', nameEn: 'Lofra Gas Cooker 90cm', brand: 'Lofra', category: 'cooker', productClass: 'A', cubeM3: 0.62, weightKg: 78, fragile: false, stackable: false, installType: 'gas', crewRequired: 2, handlingMinutes: 12, installMinutes: 30, dimensionsEstimated: false },
  { sku: 'KMG-CK-60', nameAr: 'غاز KMG ٦٠ سم', nameEn: 'KMG Gas Cooker 60cm', brand: 'KMG', category: 'cooker', productClass: 'A', cubeM3: 0.45, weightKg: 55, fragile: false, stackable: false, installType: 'gas', crewRequired: 2, handlingMinutes: 10, installMinutes: 28, dimensionsEstimated: true },
  { sku: 'KMG-OV-BI', nameAr: 'فرن KMG مدمج', nameEn: 'KMG Built-in Oven', brand: 'KMG', category: 'oven', productClass: 'A', cubeM3: 0.18, weightKg: 34, fragile: false, stackable: false, installType: 'electrical', crewRequired: 2, handlingMinutes: 8, installMinutes: 30, dimensionsEstimated: true },
  { sku: 'ELI-HD-90', nameAr: 'شفاط إيليكا ٩٠ سم', nameEn: 'Elica Cooker Hood 90cm', brand: 'Elica', category: 'hood', productClass: 'A', cubeM3: 0.15, weightKg: 18, fragile: false, stackable: false, installType: 'mount', crewRequired: 2, handlingMinutes: 6, installMinutes: 35, dimensionsEstimated: false },
  { sku: 'SAM-AC-18K', nameAr: 'مكيف سامسونج سبليت ١٨٠٠٠', nameEn: 'Samsung Split AC 18,000 BTU', brand: 'Samsung', category: 'air_conditioner', productClass: 'A', cubeM3: 0.28, weightKg: 45, fragile: false, stackable: false, installType: 'mount', crewRequired: 2, handlingMinutes: 9, installMinutes: 45, dimensionsEstimated: false },
  { sku: 'SAM-TV-65', nameAr: 'شاشة سامسونج ذكية ٦٥ بوصة', nameEn: 'Samsung Smart TV 65"', brand: 'Samsung', category: 'television', productClass: 'A', cubeM3: 0.35, weightKg: 32, fragile: true, stackable: false, installType: 'mount', crewRequired: 2, handlingMinutes: 8, installMinutes: 25, dimensionsEstimated: false },
  { sku: 'TCL-TV-55', nameAr: 'شاشة TCL ٥٥ بوصة', nameEn: 'TCL Smart TV 55"', brand: 'TCL', category: 'television', productClass: 'A', cubeM3: 0.25, weightKg: 22, fragile: true, stackable: false, installType: 'mount', crewRequired: 2, handlingMinutes: 7, installMinutes: 25, dimensionsEstimated: false },
  { sku: 'KMG-TV-43', nameAr: 'شاشة KMG ٤٣ بوصة', nameEn: 'KMG TV 43"', brand: 'KMG', category: 'television', productClass: 'A', cubeM3: 0.14, weightKg: 12, fragile: true, stackable: false, installType: 'none', crewRequired: 1, handlingMinutes: 5, installMinutes: 0, dimensionsEstimated: true },

  // --- Class B: small domestic appliances ----------------------------------
  { sku: 'MLX-FP-900', nameAr: 'محضرة طعام مولينكس', nameEn: 'Moulinex Food Processor', brand: 'Moulinex', category: 'small_appliance', productClass: 'B', cubeM3: 0.02, weightKg: 4.5, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 3, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'TEF-AF-XL', nameAr: 'قلاية هوائية تيفال', nameEn: 'Tefal Air Fryer XL', brand: 'Tefal', category: 'small_appliance', productClass: 'B', cubeM3: 0.03, weightKg: 6, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 3, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'KRU-ES-PRO', nameAr: 'ماكينة اسبريسو كروبس', nameEn: 'Krups Espresso Machine', brand: 'Krups', category: 'small_appliance', productClass: 'B', cubeM3: 0.025, weightKg: 5.5, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 3, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'BAB-HD-2200', nameAr: 'سشوار بابليس', nameEn: 'BaByliss Hair Dryer', brand: 'BaByliss', category: 'personal_care', productClass: 'B', cubeM3: 0.004, weightKg: 1, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 2, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'TEF-IR-STM', nameAr: 'مكواة بخار تيفال', nameEn: 'Tefal Steam Iron', brand: 'Tefal', category: 'small_appliance', productClass: 'B', cubeM3: 0.006, weightKg: 2, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 2, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'JBL-SP-FLIP', nameAr: 'مكبر صوت JBL محمول', nameEn: 'JBL Portable Speaker', brand: 'JBL', category: 'audio', productClass: 'B', cubeM3: 0.02, weightKg: 3.5, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 2, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'MLX-BL-700', nameAr: 'خلاط مولينكس', nameEn: 'Moulinex Blender', brand: 'Moulinex', category: 'small_appliance', productClass: 'B', cubeM3: 0.012, weightKg: 3, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 2, installMinutes: 0, dimensionsEstimated: false },

  // --- Class C: kitchenware, glassware, gifts (fragile) --------------------
  { sku: 'LUM-DS-44', nameAr: 'طقم صحون لومينارك ٤٤ قطعة', nameEn: 'Luminarc Dinner Set 44pc', brand: 'Luminarc', category: 'tableware', productClass: 'C', cubeM3: 0.05, weightKg: 12, fragile: true, stackable: false, installType: 'none', crewRequired: 1, handlingMinutes: 4, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'PYR-BK-SET', nameAr: 'طقم أواني فرن بايركس', nameEn: 'Pyrex Bakeware Set', brand: 'Pyrex', category: 'cookware', productClass: 'C', cubeM3: 0.02, weightKg: 4, fragile: true, stackable: false, installType: 'none', crewRequired: 1, handlingMinutes: 3, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'CDA-GL-6', nameAr: 'طقم كاسات كريستال دارك ٦ قطع', nameEn: "Cristal d'Arques Glasses 6pc", brand: "Cristal d'Arques", category: 'glassware', productClass: 'C', cubeM3: 0.01, weightKg: 2.5, fragile: true, stackable: false, installType: 'none', crewRequired: 1, handlingMinutes: 3, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'EMS-TH-1L', nameAr: 'ترمس إمسا ١ لتر', nameEn: 'Emsa Thermos 1L', brand: 'Emsa', category: 'housewares', productClass: 'C', cubeM3: 0.006, weightKg: 1.2, fragile: false, stackable: true, installType: 'none', crewRequired: 1, handlingMinutes: 2, installMinutes: 0, dimensionsEstimated: false },
  { sku: 'LUM-ST-10', nameAr: 'طقم حفظ زجاجي لومينارك', nameEn: 'Luminarc Glass Storage Set', brand: 'Luminarc', category: 'housewares', productClass: 'C', cubeM3: 0.018, weightKg: 3.5, fragile: true, stackable: false, installType: 'none', crewRequired: 1, handlingMinutes: 3, installMinutes: 0, dimensionsEstimated: false },
];

export const PRODUCT_MAP = new Map(PRODUCTS.map((p) => [p.sku, p]));

export const CLASS_A_SKUS = PRODUCTS.filter((p) => p.productClass === 'A').map((p) => p.sku);
export const CLASS_B_SKUS = PRODUCTS.filter((p) => p.productClass === 'B').map((p) => p.sku);
export const CLASS_C_SKUS = PRODUCTS.filter((p) => p.productClass === 'C').map((p) => p.sku);
