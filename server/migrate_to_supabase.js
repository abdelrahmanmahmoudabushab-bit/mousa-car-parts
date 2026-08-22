import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isSupabaseConfigured, bulkUploadProductsToSupabase, supabaseFetch } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'pos_database.json');

async function migrate() {
  console.log('🚀 Starting Mousa POS -> Supabase Migration Utility...');

  if (!isSupabaseConfigured()) {
    console.error('❌ Error: Supabase credentials not found in environment.');
    console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) before running this script.');
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ pos_database.json not found at:', DB_PATH);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(rawData);

  console.log(`📦 Loaded ${db.products?.length || 0} products and ${db.categories?.length || 0} categories from local database.`);

  // 1. Upload Categories
  if (db.categories && db.categories.length > 0) {
    console.log('⬆️ Uploading categories to Supabase...');
    const catPayload = db.categories.map(c => ({
      id: c.id,
      name: c.name,
      ar_name: c.arName || c.ar_name || c.name || '',
      icon: c.icon || ''
    }));

    try {
      await supabaseFetch('categories', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(catPayload)
      });
      console.log('✅ Categories uploaded successfully!');
    } catch (err) {
      console.error('⚠️ Category upload warning:', err.message);
    }
  }

  // 2. Upload Products
  if (db.products && db.products.length > 0) {
    console.log('⬆️ Uploading 7,942 BYD OEM Products to Supabase PostgreSQL...');
    try {
      const total = await bulkUploadProductsToSupabase(db.products);
      console.log(`🎉 SUCCESS! Successfully migrated ${total} products to Supabase PostgreSQL!`);
    } catch (err) {
      console.error('❌ Product upload error:', err.message);
    }
  }
}

migrate();
