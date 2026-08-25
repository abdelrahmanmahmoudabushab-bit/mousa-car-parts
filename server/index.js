import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateCnToAr } from './translator.js';
import { db, verifyPassword } from './db.js';
import { signJwt, verifyJwt, authenticateToken, requireRole } from './auth.js';
import { isSupabaseConfigured, getSupabaseProducts, getSupabaseCategories, saveSupabaseOrder, syncLocalAndSupabaseCloud } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 30-Minute Automatic Cloud & Local Database Sync Engine
let lastSyncState = {
  lastSyncTime: new Date().toISOString(),
  status: 'Idle / Ready',
  isSyncing: false
};

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

async function runScheduledAutoSync() {
  if (lastSyncState.isSyncing) return;
  lastSyncState.isSyncing = true;
  lastSyncState.status = 'Syncing...';
  console.log('🔄 [Auto-Sync] Starting 30-minute database synchronization...');

  const res = await syncLocalAndSupabaseCloud(db);
  lastSyncState.isSyncing = false;
  lastSyncState.lastSyncTime = new Date().toISOString();
  if (res.success) {
    lastSyncState.status = 'Completed Successfully';
  } else {
    lastSyncState.status = 'Offline Mode / Local Active (' + (res.reason || res.error || 'Cloud Unavailable') + ')';
  }
}

// Start 30-Minute Interval Sync Timer
setInterval(runScheduledAutoSync, SYNC_INTERVAL_MS);
// Run initial sync 10 seconds after server launch
setTimeout(runScheduledAutoSync, 10000);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cache-Busting & High-Concurrency Performance Middleware
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// POST Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.findUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = signJwt({ id: user.id, username: user.username, role: user.role, name: user.name });
  const { password_hash, ...userProfile } = user;

  res.json({
    success: true,
    token,
    user: userProfile
  });
});

// GET Current Authenticated User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }
  res.json({ success: true, user });
});

// GET All Users (Admin Only)
app.get('/api/users', authenticateToken, requireRole(['Admin']), (req, res) => {
  res.json({ success: true, users: db.getUsers() });
});

// POST Create User (Admin Only)
app.post('/api/users', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required.' });
    }
    const newUser = db.createUser({ username, password, name, role });
    res.status(201).json({ success: true, user: newUser, users: db.getUsers() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE User (Admin Only)
app.delete('/api/users/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { id } = req.params;
  if (req.user.id === id) {
    return res.status(400).json({ error: 'Cannot delete your own active admin account.' });
  }
  db.deleteUser(id);
  res.json({ success: true, users: db.getUsers() });
});

// In-memory server cache for INSTANT sub-10ms response times
let memoryCache = {
  products: null,
  categories: null,
  lastUpdated: 0
};

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCachedBootstrapData() {
  const now = Date.now();
  if (memoryCache.products && (now - memoryCache.lastUpdated < CACHE_TTL_MS)) {
    return memoryCache;
  }

  const localProds = db.getProducts();
  const localCats = db.getCategories();

  memoryCache.products = localProds;
  memoryCache.categories = localCats;
  memoryCache.lastUpdated = now;
  return memoryCache;
}

// GET Initial state (Instant In-Memory Cache Response)
app.get('/api/bootstrap', async (req, res) => {
  try {
    const cache = await getCachedBootstrapData();
    res.json({
      products: cache.products,
      categories: cache.categories,
      orders: db.getOrders(),
      dbSource: isSupabaseConfigured() ? 'Supabase PostgreSQL (In-Memory Cache)' : 'Local JSON'
    });
  } catch (err) {
    res.json({
      products: db.getProducts(),
      categories: db.getCategories(),
      orders: db.getOrders(),
      dbSource: 'Local JSON Fallback'
    });
  }
});

// GET All Products Directly
app.get('/api/products', (req, res) => {
  res.json({ success: true, products: db.getProducts(), categories: db.getCategories() });
});

// GET VIN Lookup
app.get('/api/products/vin-lookup', (req, res) => {
  const { vin } = req.query;
  const matches = db.findProductsByVin(vin);
  res.json({ success: true, count: matches.length, products: matches });
});

// POST Save or Edit Product (Manager or Admin)
app.post('/api/products/save', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const product = req.body;
  const products = db.saveProduct(product);
  res.json({ success: true, products });
});

// POST Quick Stock Adjust (+1 or -1)
app.post('/api/products/adjust-stock', authenticateToken, requireRole(['Admin', 'Manager', 'Cashier']), (req, res) => {
  const { productId, delta } = req.body;
  const products = db.adjustStock(productId, delta);
  res.json({ success: true, products });
});

// DELETE Product (Admin Only)
app.delete('/api/products/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { id } = req.params;
  const products = db.deleteProduct(id);
  res.json({ success: true, products });
});

// POST Checkout Order (POS Counter & Online Customer Store)
app.post('/api/orders', async (req, res) => {
  const order = req.body;

  // Validate order has items
  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: 'Cannot create order with empty items.' });
  }

  // If request has auth token header, attach user name
  const authHeader = req.headers['authorization'];
  const authToken = authHeader && authHeader.split(' ')[1];
  if (authToken) {
    try {
      const decoded = verifyJwt(authToken);
      if (decoded) {
        order.cashier = order.cashier || decoded.name || decoded.username;
      }
    } catch (e) {
      // Ignore token decode error for guest online customer store orders
    }
  }

  if (!order.cashier) {
    order.cashier = order.source || 'Online Customer Store';
  }

  const result = db.createOrder(order);

  // Sync with Supabase PostgreSQL if configured
  if (isSupabaseConfigured()) {
    try {
      await saveSupabaseOrder(result.order);
    } catch (err) {
      console.error('Supabase order sync error:', err.message);
    }
  }

  res.status(201).json({ success: true, order: result.order, products: result.products });
});

// POST Return Order & Restock Inventory
app.post('/api/orders/return', authenticateToken, (req, res) => {
  try {
    const { orderId, returnedItems, reason } = req.body;
    if (!orderId || !Array.isArray(returnedItems) || returnedItems.length === 0) {
      return res.status(400).json({ error: 'orderId and returnedItems array are required.' });
    }

    const result = db.returnOrder({ orderId, returnedItems, reason });
    
    // Invalidate in-memory cache
    memoryCache.lastUpdated = 0;

    res.json({
      success: true,
      message: `Order ${orderId} successfully returned. Restocked ${result.totalRestockedQty} item(s) back to inventory.`,
      products: result.products,
      orders: result.orders,
      order: result.order
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// TRANSLATION & BATCH IMPORT ENDPOINTS
// -------------------------------------------------------------

// POST Translate Batch (Chinese -> Arabic)
app.post('/api/import/translate-batch', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const translatedItems = await Promise.all(
      items.map(async (item) => {
        const textToTranslate = item.cnName || item.name || '';
        const arName = await translateCnToAr(textToTranslate);
        return {
          ...item,
          arName: item.arName || arName,
          translatedAr: arName
        };
      })
    );

    res.json({ success: true, items: translatedItems });
  } catch (err) {
    console.error('Error during batch translation:', err);
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
});

// POST Batch Import (Manager or Admin)
app.post('/api/import/confirm-batch', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import' });
    }

    const result = db.batchImportProducts(items);
    res.json({
      success: true,
      products: result.products,
      summary: result.summary
    });
  } catch (err) {
    console.error('Error during batch stock import:', err);
    res.status(500).json({ error: 'Import failed', details: err.message });
  }
});

// POST Clear All Products and Orders Data (Admin Only)
app.post('/api/admin/clear-all-data', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const result = db.clearAllData();
    // Invalidate in-memory server cache
    memoryCache.products = [];
    memoryCache.orders = [];
    memoryCache.lastUpdated = Date.now();

    res.json({
      success: true,
      message: 'All inventory products and sales orders have been completely cleared.',
      products: [],
      orders: []
    });
  } catch (err) {
    console.error('Error clearing database data:', err);
    res.status(500).json({ error: 'Failed to clear data: ' + err.message });
  }
});

// GET 30-Minute Auto-Sync Status & Health
app.get('/api/sync-status', (req, res) => {
  res.json({
    success: true,
    supabaseConfigured: isSupabaseConfigured(),
    syncIntervalMinutes: 30,
    lastSyncTime: lastSyncState.lastSyncTime,
    status: lastSyncState.status,
    isSyncing: lastSyncState.isSyncing
  });
});

// POST Trigger Immediate Sync Now (On Demand)
app.post('/api/sync-now', async (req, res) => {
  try {
    await runScheduledAutoSync();
    res.json({
      success: true,
      lastSyncState
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

// -------------------------------------------------------------
// PRODUCTION STATIC FILE SERVING (SINGLE-SERVER DEPLOYMENT)
// Root / -> Customer Web Store (Simplest for Public Users)
// /pos -> Cashier Counter POS Terminal
// -------------------------------------------------------------
const distPath = path.join(__dirname, '..', 'dist');
const distCustomerPath = path.join(__dirname, '..', 'dist-customer');

// Serve Customer Web Store at /customer
if (fs.existsSync(distCustomerPath)) {
  app.use('/customer', express.static(distCustomerPath));
}

// Serve Cashier Counter POS Terminal at /pos
if (fs.existsSync(distPath)) {
  app.use('/pos', express.static(distPath));
  app.get('/pos/*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Health check endpoint for Railway & Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root / Serves Main React Application or Customer Store
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  
  if (fs.existsSync(distCustomerPath) && (req.path.startsWith('/customer') || req.path === '/store')) {
    return res.sendFile(path.join(distCustomerPath, 'customer.html'));
  }
  
  if (fs.existsSync(distPath)) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  
  res.status(200).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:20%">⚡ Mousa Auto Parts Backend API Online!</h2>');
});

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Mousa Auto Parts Server running on http://0.0.0.0:${PORT}`);
  console.log(`   - Cashier POS Counter: http://localhost:${PORT}/pos`);
  console.log(`   - Customer Web Store:  http://localhost:${PORT}/`);
});
