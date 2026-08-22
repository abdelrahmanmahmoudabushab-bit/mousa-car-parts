import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateCnToAr } from './translator.js';
import { db, verifyPassword } from './db.js';
import { signJwt, verifyJwt, authenticateToken, requireRole } from './auth.js';
import { isSupabaseConfigured, getSupabaseProducts, getSupabaseCategories, saveSupabaseOrder } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// -------------------------------------------------------------
// BOOTSTRAP & CATALOG DATA ENDPOINTS
// -------------------------------------------------------------

// GET Initial state
app.get('/api/bootstrap', async (req, res) => {
  if (isSupabaseConfigured()) {
    try {
      const [sbProducts, sbCategories] = await Promise.all([
        getSupabaseProducts(),
        getSupabaseCategories()
      ]);

      if (sbProducts && sbProducts.length > 0) {
        return res.json({
          products: sbProducts,
          categories: sbCategories.length > 0 ? sbCategories : db.getCategories(),
          orders: db.getOrders(),
          dbSource: 'Supabase PostgreSQL'
        });
      }
    } catch (err) {
      console.error('Supabase bootstrap query error, falling back to local DB:', err.message);
    }
  }

  res.json({
    products: db.getProducts(),
    categories: db.getCategories(),
    orders: db.getOrders(),
    dbSource: 'Local JSON Database'
  });
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
  
  // If request has auth token header, attach user name
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      order.cashier = order.cashier || decoded.name || decoded.username;
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

// -------------------------------------------------------------
// PRODUCTION STATIC FILE SERVING (SINGLE-SERVER DEPLOYMENT)
// -------------------------------------------------------------
const distPath = path.join(__dirname, '..', 'dist');
const distCustomerPath = path.join(__dirname, '..', 'dist-customer');

// Customer Store Production Route: /customer
if (fs.existsSync(distCustomerPath)) {
  app.use('/customer', express.static(distCustomerPath));
  app.get('/customer/*', (req, res) => {
    res.sendFile(path.join(distCustomerPath, 'customer.html'));
  });
}

// Cashier POS Terminal Production Route: /
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/customer')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`⚡ Mousa Auto Parts Production Server running on http://localhost:${PORT}`);
  console.log(`   - Cashier POS Counter: http://localhost:${PORT}/`);
  console.log(`   - Customer Web Store:  http://localhost:${PORT}/customer`);
  console.log(`   - Live Database:       ${isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local JSON'}`);
});
