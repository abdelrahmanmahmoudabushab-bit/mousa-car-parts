import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateCnToAr } from './translator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'pos_database.json');

async function runTranslationPass() {
  console.log('Reading pos_database.json...');
  const rawData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(rawData);

  let updatedCount = 0;
  console.log(`Starting human Arabic translation pass over ${db.products.length} products...`);

  for (let i = 0; i < db.products.length; i++) {
    const prod = db.products[i];
    const sourceText = prod.cnName || prod.name || '';
    
    // Translate Chinese source to natural human Arabic
    if (sourceText && /[\u4e00-\u9fa5]/.test(sourceText)) {
      const humanAr = await translateCnToAr(sourceText);
      if (humanAr && humanAr !== sourceText && humanAr !== prod.arName) {
        prod.arName = humanAr;
        updatedCount++;
      }
    }

    if ((i + 1) % 1000 === 0) {
      console.log(`Processed ${i + 1} / ${db.products.length} products...`);
    }
  }

  console.log(`Writing updated database with ${updatedCount} human Arabic translations...`);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✅ Human Arabic translation pass complete!');
}

runTranslationPass().catch(err => {
  console.error('Error during translation pass:', err);
});
