import { matchProductSearch } from '../src/utils/documentParser.js';

const catalog = [
  { id: '1', oem: 'EQEA-5402841', name: 'Front Brake Pad', arName: 'قماش فرامل أمامي', vehicleModel: 'BYD Seagull' },
  { id: '2', oem: '6206109', name: 'Oil Filter', arName: 'فلتر زيت', vehicleModel: 'BYD Dolphin' },
  { id: '3', oem: 'BYDDO', name: 'Door Handle', arName: 'مقبض باب', vehicleModel: 'BYD Atto 3' },
  { id: '4', oem: 'ST-840301', name: 'Rear Axle Bearing', arName: 'رولمان بلي خلفي', vehicleModel: 'BYD Tang' },
];

console.log("Searching for 'BYDDO' in catalog:");
catalog.forEach(p => {
  const result = matchProductSearch(p, 'BYDDO');
  console.log(`  Product ${p.id} (${p.oem}): ${result}`);
});

const found = catalog.find(p => matchProductSearch(p, 'BYDDO'));
console.log("\nFirst match:", found?.id, found?.oem);
