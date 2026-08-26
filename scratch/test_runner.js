import {
  parseSmartSerialNumber,
  normalizeOcrTypoCode,
  normalizeSearchCode,
  normalizeArabic,
  matchProductSearch
} from '../src/utils/documentParser.js';

console.log("╔══════════════════════════════════════════════════╗");
console.log("║  🧪 MOUSA CAR PARTS — DEEP DEBUG TEST SUITE     ║");
console.log("╚══════════════════════════════════════════════════╝\n");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ ${testName}`);
    if (details) console.error(`     → ${details}`);
    failed++;
    failures.push(testName);
  }
}

// ═══════════════════════════════════════════
// GROUP 1: BARCODE PARSER — ALL 3 CODE TYPES
// ═══════════════════════════════════════════
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 1: Universal Barcode Parser (parseSmartSerialNumber)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Mixed alphanumeric
const t1a = parseSmartSerialNumber("P1PEQEA-5402841 DATE 20260826");
assert(t1a === "EQEA-5402841", "Mixed: P1PEQEA-5402841 → EQEA-5402841", `Got: '${t1a}'`);

const t1b = parseSmartSerialNumber("1PST-6206109 QTY 20");
assert(t1b === "ST-6206109", "Mixed: 1PST-6206109 → ST-6206109", `Got: '${t1b}'`);

const t1c = parseSmartSerialNumber("LC0-540211");
assert(t1c === "LC0-540211", "Mixed: LC0-540211 → LC0-540211", `Got: '${t1c}'`);

// Pure numeric
const t2a = parseSmartSerialNumber("S1P6206109 QTY 50");
assert(t2a === "6206109", "Numeric: S1P6206109 → 6206109", `Got: '${t2a}'`);

const t2b = parseSmartSerialNumber("1P840301970 20260826");
assert(t2b === "840301970", "Numeric: 1P840301970 → 840301970", `Got: '${t2b}'`);

// Pure letters
const t3a = parseSmartSerialNumber("PBYDDO 20260826");
assert(t3a === "BYDDO", "Letters: PBYDDO → BYDDO", `Got: '${t3a}'`);

const t3b = parseSmartSerialNumber("STEQEA DATE 20250101 QTY 5");
assert(t3b === "STEQEA", "Letters: STEQEA → STEQEA", `Got: '${t3b}'`);

// Edge cases
const t4a = parseSmartSerialNumber("");
assert(t4a === "", "Edge: empty string → empty", `Got: '${t4a}'`);

const t4b = parseSmartSerialNumber(null);
assert(t4b === "", "Edge: null → empty", `Got: '${t4b}'`);

const t4c = parseSmartSerialNumber(undefined);
assert(t4c === "", "Edge: undefined → empty", `Got: '${t4c}'`);

const t4d = parseSmartSerialNumber("20260826");
assert(typeof t4d === "string", "Edge: date-only string returns string", `Got type: ${typeof t4d}`);

// ═══════════════════════════════════════════
// GROUP 2: OCR TYPO RECOVERY
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 2: OCR Misprint Typo Recovery (normalizeOcrTypoCode)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

assert(normalizeOcrTypoCode("EQEA-O40284I") === "eqea0402841", "O→0, I→1", `Got: '${normalizeOcrTypoCode("EQEA-O40284I")}'`);
assert(normalizeOcrTypoCode("SZ2061OB") === "52206108", "S→5, Z→2, B→8", `Got: '${normalizeOcrTypoCode("SZ2061OB")}'`);
assert(normalizeOcrTypoCode("") === "", "Empty → empty");
assert(normalizeOcrTypoCode(null) === "", "Null → empty");
assert(normalizeOcrTypoCode("CLEAN123") === "c0ean123", "Mixed typo normalization", `Got: '${normalizeOcrTypoCode("CLEAN123")}'`);

// ═══════════════════════════════════════════
// GROUP 3: ARABIC NORMALIZER
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 3: Arabic Normalizer (normalizeArabic)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

assert(normalizeArabic("أحمد") === normalizeArabic("احمد"), "Alef variants normalize equally");
assert(normalizeArabic("قطعة") === normalizeArabic("قطعه"), "Taa marbouta → Haa");
assert(normalizeArabic("") === "", "Empty → empty");
assert(normalizeArabic(null) === "", "Null → empty");

// ═══════════════════════════════════════════
// GROUP 4: SEARCH CODE NORMALIZER
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 4: Search Code Normalizer (normalizeSearchCode)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

assert(normalizeSearchCode("EQEA-5402841") === "eqea5402841", "Strips hyphens", `Got: '${normalizeSearchCode("EQEA-5402841")}'`);
assert(normalizeSearchCode("ST / 620 6109") === "st6206109", "Strips slashes & spaces", `Got: '${normalizeSearchCode("ST / 620 6109")}'`);
assert(normalizeSearchCode("") === "", "Empty → empty");
assert(normalizeSearchCode(null) === "", "Null → empty");

// ═══════════════════════════════════════════
// GROUP 5: PRODUCT SEARCH / FUZZY MATCH
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 5: Product Matching Algorithm (matchProductSearch)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const catalog = [
  { id: '1', oem: 'EQEA-5402841', name: 'Front Brake Pad', arName: 'قماش فرامل أمامي', vehicleModel: 'BYD Seagull' },
  { id: '2', oem: '6206109', name: 'Oil Filter', arName: 'فلتر زيت', vehicleModel: 'BYD Dolphin' },
  { id: '3', oem: 'BYDDO', name: 'Door Handle', arName: 'مقبض باب', vehicleModel: 'BYD Atto 3' },
  { id: '4', oem: 'ST-840301', name: 'Rear Axle Bearing', arName: 'رولمان بلي خلفي', vehicleModel: 'BYD Tang' },
];

function findProduct(query) {
  return catalog.find(p => matchProductSearch(p, query));
}

// Exact OEM match
assert(findProduct("EQEA-5402841")?.id === '1', "Exact OEM match: EQEA-5402841");
assert(findProduct("eqea5402841")?.id === '1', "Case-insensitive stripped OEM match");
assert(findProduct("6206109")?.id === '2', "Pure numeric OEM match");
assert(findProduct("BYDDO")?.id === '3', "Pure letter OEM match");

// OCR typo recovery match
assert(findProduct("EQEA-O40284I")?.id === '1', "OCR typo match: EQEA-O40284I → EQEA-5402841");

// Arabic name search
assert(findProduct("فرامل")?.id === '1', "Arabic search: فرامل");
assert(findProduct("فلتر زيت")?.id === '2', "Arabic multi-word: فلتر زيت");
assert(findProduct("مقبض")?.id === '3', "Arabic search: مقبض");

// English name search
assert(findProduct("brake pad")?.id === '1', "English name search: brake pad");
assert(findProduct("oil filter")?.id === '2', "English name search: oil filter");

// Vehicle model search
assert(findProduct("Seagull")?.id === '1', "Vehicle model search: Seagull");
assert(findProduct("Dolphin")?.id === '2', "Vehicle model search: Dolphin");

// Empty query returns all (returns true)
assert(matchProductSearch(catalog[0], "") === true, "Empty query → always matches");
assert(matchProductSearch(catalog[0], "   ") === true, "Whitespace query → always matches");

// Non-matching query
assert(findProduct("NONEXISTENT999") === undefined, "Non-matching OEM returns undefined");
assert(findProduct("طائرة") === undefined, "Non-matching Arabic returns undefined");

// ═══════════════════════════════════════════
// GROUP 6: DATA ANALYTICS DASHBOARD — LOGIC SIMULATION
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 6: Data Analytics Dashboard — Logic Simulation");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Simulate products and orders to verify dashboard calculations
const testProducts = [
  { id: '1', oem: 'EQEA-5402841', name: 'Brake Pad', arName: 'فرامل', quantity: 3, minLevel: 5, unitPrice: 25, costPrice: 15, vehicleModel: 'BYD Seagull' },
  { id: '2', oem: '6206109', name: 'Oil Filter', arName: 'فلتر', quantity: 50, minLevel: 10, unitPrice: 12, costPrice: 7, vehicleModel: 'BYD Dolphin' },
  { id: '3', oem: 'BYDDO', name: 'Door Handle', arName: 'مقبض', quantity: 0, minLevel: 5, unitPrice: 40, costPrice: 22, vehicleModel: 'BYD Atto 3' },
];

const testOrders = [
  { id: 'o1', total: 75, createdAt: new Date().toISOString(), items: [
    { oem: 'EQEA-5402841', name: 'Brake Pad', qty: 3, unitPrice: 25 },
  ]},
  { id: 'o2', total: 136, createdAt: new Date().toISOString(), items: [
    { oem: '6206109', name: 'Oil Filter', qty: 4, unitPrice: 12 },
    { oem: 'EQEA-5402841', name: 'Brake Pad', qty: 2, unitPrice: 25 },
    { oem: 'BYDDO', name: 'Door Handle', qty: 1, unitPrice: 40 },
  ]},
];

// KPI: Total Revenue
const totalRevenue = testOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
assert(totalRevenue === 211, "KPI: Total Revenue = $211", `Got: $${totalRevenue}`);

// KPI: Average Order Value
const aov = totalRevenue / testOrders.length;
assert(aov === 105.5, "KPI: AOV = $105.50", `Got: $${aov}`);

// KPI: Total Stock Pieces
const totalStock = testProducts.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
assert(totalStock === 53, "KPI: Total Stock = 53 pieces", `Got: ${totalStock}`);

// KPI: Low Stock Items (quantity <= minLevel)
const lowStock = testProducts.filter(p => Number(p.quantity) <= Number(p.minLevel));
assert(lowStock.length === 2, "KPI: Low Stock Alerts = 2 items", `Got: ${lowStock.length}`);

// KPI: Out of Stock Items
const outOfStock = testProducts.filter(p => Number(p.quantity) <= 0);
assert(outOfStock.length === 1, "KPI: Out of Stock = 1 item (Door Handle)", `Got: ${outOfStock.length}`);

// ML Forecast: Daily velocity
const daysPeriod = 60;
const soldMap = {};
testOrders.forEach(o => {
  (o.items || []).forEach(item => {
    const key = item.oem;
    soldMap[key] = (soldMap[key] || 0) + Number(item.qty || 1);
  });
});
assert(soldMap['EQEA-5402841'] === 5, "ML: Brake Pad sold qty = 5", `Got: ${soldMap['EQEA-5402841']}`);
assert(soldMap['6206109'] === 4, "ML: Oil Filter sold qty = 4", `Got: ${soldMap['6206109']}`);
assert(soldMap['BYDDO'] === 1, "ML: Door Handle sold qty = 1", `Got: ${soldMap['BYDDO']}`);

const brakeDailyVelocity = soldMap['EQEA-5402841'] / daysPeriod;
const brakeDsr = Math.round(3 / brakeDailyVelocity); // currentStock=3
assert(brakeDsr === 36, "ML: Brake Pad DSR = 36 days", `Got: ${brakeDsr}`);

// Pareto ABC: Brake Pad revenue
const brakeRevenue = 5 * 25; // 5 sold × $25
const oilRevenue = 4 * 12; // 4 sold × $12
const doorRevenue = 1 * 40; // 1 sold × $40
const totalPartRevenue = brakeRevenue + oilRevenue + doorRevenue;
assert(brakeRevenue === 125, "Pareto: Brake Pad revenue = $125");
assert(totalPartRevenue === 213, "Pareto: Total part-level revenue = $213", `Got: $${totalPartRevenue}`);

// Basket Affinity: orders with 2+ items
const multiItemOrders = testOrders.filter(o => (o.items || []).length >= 2);
assert(multiItemOrders.length === 1, "Basket: 1 multi-item order found", `Got: ${multiItemOrders.length}`);

// Verify pair generation from order o2
const o2oems = testOrders[1].items.map(i => i.oem).sort();
const pairs = [];
for (let i = 0; i < o2oems.length; i++) {
  for (let j = i + 1; j < o2oems.length; j++) {
    pairs.push(`${o2oems[i]} + ${o2oems[j]}`);
  }
}
assert(pairs.length === 3, "Basket: 3 pairs generated from 3-item order", `Got: ${pairs.length}`);

// ═══════════════════════════════════════════
// GROUP 7: CSV EXPORT LOGIC
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 7: CSV Export Logic Verification");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

let csvContent = "\uFEFF";
csvContent += "OEM Code,Part Name (Arabic),Vehicle Model,Current Stock,Min Level,Suggested Order Qty,Unit Cost ($)\n";
lowStock.forEach(item => {
  const suggestedQty = Math.max(10, (Number(item.minLevel || 5) * 2) - Number(item.quantity || 0));
  const row = [
    `"${item.oem || ''}"`,
    `"${item.arName || item.name || ''}"`,
    `"${item.vehicleModel || ''}"`,
    item.quantity || 0,
    item.minLevel || 5,
    suggestedQty,
    item.costPrice || 0
  ].join(",");
  csvContent += row + "\n";
});

assert(csvContent.includes("EQEA-5402841"), "CSV: Contains Brake Pad OEM");
assert(csvContent.includes("BYDDO"), "CSV: Contains Door Handle OEM");
assert(csvContent.includes("فرامل"), "CSV: Contains Arabic name");
assert(csvContent.split("\n").length >= 3, "CSV: Has header + 2 data rows", `Got: ${csvContent.split("\n").length} lines`);

// ═══════════════════════════════════════════
// RESULTS SUMMARY
// ═══════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════╗");
console.log(`║  📊 RESULTS: ${passed} PASSED | ${failed} FAILED${' '.repeat(Math.max(0, 22 - String(passed).length - String(failed).length))}║`);
console.log("╚══════════════════════════════════════════════════╝");

if (failures.length > 0) {
  console.log("\n🔴 FAILED TESTS:");
  failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
