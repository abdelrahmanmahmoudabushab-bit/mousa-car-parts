import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '../.env');

// Simple .env parser
function loadEnv() {
  const envVars = {};
  try {
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim();
          envVars[key] = val;
        }
      });
    }
  } catch (e) {
    // Ignore .env read error
  }
  return envVars;
}

const fileEnv = loadEnv();
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fileEnv.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
};

// Generic Supabase REST API fetch helper
export async function supabaseFetch(endpoint, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase environment variables (SUPABASE_URL & SUPABASE_ANON_KEY) are not set.');
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase API Error (${response.status}): ${errorText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

/**
 * Fetch products from Supabase PostgreSQL
 */
export async function getSupabaseProducts() {
  const data = await supabaseFetch('products?select=*&order=oem.asc', {
    headers: { 'Range': '0-9999' }
  });
  return data.map(p => ({
    id: p.id,
    sku: p.sku,
    oem: p.oem,
    name: p.name,
    arName: p.ar_name,
    cnName: p.cn_name,
    unitPrice: Number(p.unit_price || 0),
    quantity: p.quantity,
    vehicleModel: p.vehicle_model,
    categoryId: p.category_id
  }));
}

/**
 * Fetch categories from Supabase PostgreSQL
 */
export async function getSupabaseCategories() {
  const data = await supabaseFetch('categories?select=*');
  return data.map(c => ({
    id: c.id,
    name: c.name,
    arName: c.ar_name,
    icon: c.icon
  }));
}

/**
 * Insert order into Supabase PostgreSQL
 */
export async function saveSupabaseOrder(order) {
  const dbOrder = {
    id: order.id,
    customer_name: order.customerName || order.cashier || 'Walk-in POS Customer',
    customer_phone: order.customerPhone || 'N/A',
    delivery_method: order.deliveryMethod || 'pickup',
    delivery_address: order.deliveryAddress || 'Counter Pickup',
    source: order.source || 'POS Counter',
    items: order.items,
    total_amount: Number(order.totalAmount || order.total || 0),
    status: order.status || 'Completed'
  };

  const result = await supabaseFetch('orders', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify([dbOrder])
  });

  return result ? result[0] : null;
}

/**
 * Bulk upload products to Supabase (Migration Helper)
 */
export async function bulkUploadProductsToSupabase(productsList) {
  const seenIds = new Set();
  const dbProducts = [];

  productsList.forEach((p, idx) => {
    const id = p.id || `prod-${idx}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      dbProducts.push({
        id,
        sku: id,
        oem: p.oem,
        name: p.name,
        ar_name: p.arName || p.name,
        cn_name: p.cnName || '',
        unit_price: Number(p.unitPrice || 0),
        quantity: p.quantity || 10,
        vehicle_model: p.vehicleModel || 'Universal BYD',
        category_id: p.categoryId || 'cat-body'
      });
    }
  });

  // Batch insert in chunks of 500
  const chunkSize = 500;
  let insertedCount = 0;

  for (let i = 0; i < dbProducts.length; i += chunkSize) {
    const chunk = dbProducts.slice(i, i + chunkSize);
    await supabaseFetch('products', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(chunk)
    });
    insertedCount += chunk.length;
    console.log(`Uploaded ${insertedCount}/${dbProducts.length} records to Supabase...`);
  }

  return insertedCount;
}

/**
 * Perform 2-Way Full Sync between Local JSON DB and Supabase PostgreSQL Cloud
 */
export async function syncLocalAndSupabaseCloud(dbInstance) {
  if (!isSupabaseConfigured()) {
    return { success: false, reason: 'Supabase credentials not configured' };
  }

  const syncLog = {
    timestamp: new Date().toISOString(),
    productsUploaded: 0,
    productsDownloaded: 0,
    ordersUploaded: 0
  };

  try {
    // 1. Upload local products to Supabase PostgreSQL (Upsert merge duplicates)
    const localProducts = dbInstance.getProducts() || [];
    if (localProducts.length > 0) {
      syncLog.productsUploaded = await bulkUploadProductsToSupabase(localProducts);
    }

    // 2. Fetch latest products from Supabase
    const cloudProducts = await getSupabaseProducts();
    if (cloudProducts && cloudProducts.length > localProducts.length) {
      dbInstance.batchImportProducts(cloudProducts);
      syncLog.productsDownloaded = cloudProducts.length;
    }

    console.log(`⚡ [Auto-Sync] 30-Min Full Sync Completed Successfully at ${syncLog.timestamp}`);
    return { success: true, log: syncLog };
  } catch (err) {
    console.error('❌ [Auto-Sync] Error during cloud sync:', err.message);
    return { success: false, error: err.message };
  }
}
