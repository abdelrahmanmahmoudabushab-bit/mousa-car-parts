import { parseSmartSerialNumber, normalizeOcrTypoCode, matchProductSearch } from '../src/utils/documentParser.js';

console.log("=================================================");
console.log("🧪 RUNNING COMPREHENSIVE AUTOMATED POS TEST SUITE");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ [PASS]: ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL]: ${testName}`);
    failed++;
  }
}

// TEST GROUP 1: UNIVERSAL 3-TYPE BARCODE PARSER
console.log("--- 1. Testing Universal Barcode Parser (Mixed, Numeric, Letters) ---");

const res1 = parseSmartSerialNumber("P1PEQEA-5402841 DATE 20260826");
assert(res1 === "EQEA-5402841", `Mixed Format Extraction (Got: '${res1}', Expected: 'EQEA-5402841')`);

const res2 = parseSmartSerialNumber("S1P6206109 QTY 50");
assert(res2 === "6206109", `Numeric-Only Extraction (Got: '${res2}', Expected: '6206109')`);

const res3 = parseSmartSerialNumber("PBYDDO 20260826");
assert(res3 === "BYDDO", `All-Letters Extraction (Got: '${res3}', Expected: 'BYDDO')`);

// TEST GROUP 2: OCR DAMAGE RECOVERY & TYPO CORRECTION
console.log("\n--- 2. Testing OCR Misprint Typo Recovery ---");

const typo1 = normalizeOcrTypoCode("EQEA-O40284I");
assert(typo1 === "eqea0402841", `Typo Recovery O/0 & I/1 (Got: '${typo1}', Expected: 'eqea0402841')`);

const typo2 = normalizeOcrTypoCode("SZ2061OB");
assert(typo2 === "52206108", `Typo Recovery S/5, Z/2, B/8 (Got: '${typo2}', Expected: '52206108')`);

// TEST GROUP 3: PRODUCT SEARCH & FUZZY MATCHING
console.log("\n--- 3. Testing Product Matching Algorithm ---");

const sampleProducts = [
  { id: '1', oem: 'EQEA-5402841', name: 'Front Brake Pad', arName: 'قماش فرامل أمامي', vehicleModel: 'BYD Seagull' },
  { id: '2', oem: '6206109', name: 'Oil Filter', arName: 'فلتر زيت', vehicleModel: 'BYD Dolphin' },
  { id: '3', oem: 'BYDDO', name: 'Door Handle', arName: 'مقبض باب', vehicleModel: 'BYD Atto 3' }
];

const match1 = sampleProducts.find(p => matchProductSearch(p, "eqea-5402841"));
assert(match1 && match1.id === '1', "Exact OEM Search Match (EQEA-5402841)");

const match2 = sampleProducts.find(p => matchProductSearch(p, "EQEA-O40284I"));
assert(match2 && match2.id === '1', "Typo-Tolerant OCR Match (EQEA-O40284I -> EQEA-5402841)");

const match3 = sampleProducts.find(p => matchProductSearch(p, "فرامل"));
assert(match3 && match3.id === '1', "Arabic Name Search Match (فرامل)");

console.log("\n=================================================");
console.log(`📊 TEST RESULTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
