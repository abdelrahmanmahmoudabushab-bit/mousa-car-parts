import {
  parseSmartSerialNumber,
  normalizeOcrTypoCode,
  normalizeSearchCode,
  normalizeArabic,
  matchProductSearch
} from '../src/utils/documentParser.js';

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  🧪 MOUSA CAR PARTS — AUTOMATED SCANNER & SYSTEM TEST SUITE  ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

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
// GROUP 1: CAMERA SCANNER DECODER & GS1 ENVELOPE STRIPPING
// ═══════════════════════════════════════════
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 1: Camera Scanner Decoder (QR & 1D Barcodes)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const qrRaw1 = "[)>]06\u001D1PEQEA-5402841\u001DQ50\u001D20260826";
const cleanQr1 = parseSmartSerialNumber(qrRaw1);
assert(cleanQr1 === "EQEA-5402841", "GS1 DataMatrix QR Payload Stripping (EQEA-5402841)", `Got: '${cleanQr1}'`);

const qrRaw2 = "S1P6206109 QTY 10 DATE 20260826";
const cleanQr2 = parseSmartSerialNumber(qrRaw2);
assert(cleanQr2 === "6206109", "Linear 1D Barcode Stripping (6206109)", `Got: '${cleanQr2}'`);

const qrRaw3 = "PBYDDO 20260826";
const cleanQr3 = parseSmartSerialNumber(qrRaw3);
assert(cleanQr3 === "BYDDO", "Alphabetic OEM Code Stripping (BYDDO)", `Got: '${cleanQr3}'`);

// ═══════════════════════════════════════════
// GROUP 2: BARCODE DIRECT SCAN MATCHING ENGINE
// ═══════════════════════════════════════════
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  GROUP 2: Barcode Direct Scan Matching Engine");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const dbProducts = [
  { id: '1', oem: 'EQEA-5402841', name: 'Front Brake Pad', arName: 'قماش فرامل أمامي', quantity: 15, unitPrice: 25, costPrice: 15, vehicleModel: 'BYD Seagull' },
  { id: '2', oem: '6206109', name: 'Oil Filter', arName: 'فلتر زيت', quantity: 50, unitPrice: 12, costPrice: 7, vehicleModel: 'BYD Dolphin' },
  { id: '3', oem: 'BYDDO', name: 'Door Handle', arName: 'مقبض باب', quantity: 8, unitPrice: 40, costPrice: 22, vehicleModel: 'BYD Atto 3' }
];

function simulateDirectBarcodeScan(scannedText) {
  if (!scannedText) return null;
  const rawStr = String(scannedText).trim();
  const cleanSerial = parseSmartSerialNumber(rawStr) || rawStr;
  const cleanCode = normalizeSearchCode(cleanSerial);

  // 1. Direct OEM/SKU/ID match
  let match = dbProducts.find(p => {
    const oemClean = normalizeSearchCode(p.oem);
    const skuClean = normalizeSearchCode(p.sku);
    const idClean = normalizeSearchCode(p.id);

    return (
      (cleanCode && oemClean === cleanCode) ||
      (cleanCode && skuClean === cleanCode) ||
      (cleanCode && idClean === cleanCode) ||
      (cleanCode.length >= 4 && (oemClean.includes(cleanCode) || skuClean.includes(cleanCode)))
    );
  });

  // 2. Fallback matchProductSearch
  if (!match) {
    match = dbProducts.find(p => matchProductSearch(p, cleanSerial) || matchProductSearch(p, rawStr));
  }

  return { product: match || null, scannedCode: cleanSerial };
}

// Test Direct Scan 1: Exact Hyphenated Match
const scan1 = simulateDirectBarcodeScan("EQEA-5402841");
assert(scan1.product?.id === '1', "Scan 1: Exact Hyphenated Code (EQEA-5402841)", `Got product: ${scan1.product?.oem}`);

// Test Direct Scan 2: Unformatted Code without Hyphen
const scan2 = simulateDirectBarcodeScan("eqea5402841");
assert(scan2.product?.id === '1', "Scan 2: Stripped Unformatted Code (eqea5402841)", `Got product: ${scan2.product?.oem}`);

// Test Direct Scan 3: Scratched Sticker OCR Typo (O -> 0, I -> 1)
const scan3 = simulateDirectBarcodeScan("EQEA-O40284I");
assert(scan3.product?.id === '1', "Scan 3: Scratched Sticker OCR Typo (EQEA-O40284I)", `Got product: ${scan3.product?.oem}`);

// Test Direct Scan 4: Numeric OEM Code
const scan4 = simulateDirectBarcodeScan("6206109");
assert(scan4.product?.id === '2', "Scan 4: Numeric OEM Code (6206109)", `Got product: ${scan4.product?.oem}`);

// Test Direct Scan 5: Unregistered Scanned Serial
const scan5 = simulateDirectBarcodeScan("UNKNOWN-OEM-9999");
assert(scan5.product === null && scan5.scannedCode === "UNKNOWN-OEM-9999", "Scan 5: Unregistered Serial Returns Null Product", `Got scannedCode: ${scan5.scannedCode}`);

// ═══════════════════════════════════════════
// RESULTS SUMMARY
// ═══════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════╗");
console.log(`║  📊 SCANNER TESTS: ${passed} PASSED | ${failed} FAILED${' '.repeat(Math.max(0, 20 - String(passed).length - String(failed).length))}║`);
console.log("╚══════════════════════════════════════════════════╝");

if (failures.length > 0) {
  console.log("\n🔴 FAILED TESTS:");
  failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log("\n🎉 ALL BARCODE SCANNER TESTS PASSED 100% CLEANLY!");
}
