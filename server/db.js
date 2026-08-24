import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'pos_database.json');

// Salted Scrypt Password Hashing
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === originalHash;
}

// Initial Seed Users
const seedUsers = [
  {
    id: 'usr-admin',
    username: 'admin',
    password_hash: hashPassword('admin123'),
    name: 'System Administrator',
    role: 'Admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-manager',
    username: 'manager',
    password_hash: hashPassword('manager123'),
    name: 'Inventory Manager',
    role: 'Manager',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-cashier',
    username: 'cashier',
    password_hash: hashPassword('cashier123'),
    name: 'Alex Counter',
    role: 'Cashier',
    created_at: new Date().toISOString()
  }
];

// Initial Seed Categories
const seedCategories = [
  { id: 'cat-body', name: 'Body Panels & Skirts (车门/裙板)', color: '#2563eb' },
  { id: 'cat-fenders', name: 'Fenders & Hoods (翼子板/舱盖)', color: '#3b82f6' },
  { id: 'cat-hinges', name: 'Door & Hood Hinges (铰链总成)', color: '#f59e0b' },
  { id: 'cat-brackets', name: 'Bumper Brackets (保险杠支架)', color: '#8b5cf6' },
  { id: 'cat-trim', name: 'Wheel Arch & Trim (轮眉/饰条)', color: '#10b981' }
];

// Initial Seed BYD Seagull Products
const seedProducts = [
  {
    id: 'P-5402841',
    sku: 'EQEA-5402841',
    oem: 'EQEA-5402841',
    name: 'Right Front Door Skirt Panel (右前门裙板)',
    cnName: '右前门裙板',
    arName: 'حافة الباب الأمامي الأيمن',
    vehicleModel: 'BYD Seagull (海鸥)',
    compatibleModels: ['BYD Seagull (海鸥)'],
    yearRange: '2023 - 2026',
    vinPattern: 'EQEA',
    brand: 'BYD Original OEM',
    categoryId: 'cat-body',
    costPrice: 42.00,
    unitPrice: 75.00,
    quantity: 16,
    minLevel: 5,
    location: 'Aisle 1 · Shelf A · Bin 01',
    supplier: 'BYD Auto Supply',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'P-5402831',
    sku: 'EQEA-5402831',
    oem: 'EQEA-5402831',
    name: 'Left Front Door Skirt Panel (左前门裙板)',
    cnName: '左前门裙板',
    arName: 'حافة الباب الأمامي الأيسر',
    vehicleModel: 'BYD Seagull (海鸥)',
    brand: 'BYD Original OEM',
    categoryId: 'cat-body',
    costPrice: 42.00,
    unitPrice: 75.00,
    quantity: 14,
    minLevel: 5,
    location: 'Aisle 1 · Shelf A · Bin 02',
    supplier: 'BYD Auto Supply',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'P-8403019',
    sku: 'EQEA-8403019/70',
    oem: 'EQEA-8403019/70',
    name: 'Right Fender Assembly M00666 (右翼子板总成 M00666)',
    cnName: '右翼子板总成 M00666',
    arName: 'تجميعة الرفرف الأيمن M00666',
    vehicleModel: 'BYD Seagull (海鸥)',
    brand: 'BYD Original OEM',
    categoryId: 'cat-fenders',
    costPrice: 85.00,
    unitPrice: 145.00,
    quantity: 8,
    minLevel: 3,
    location: 'Rack Large 02 · Shelf A',
    supplier: 'BYD Body Parts',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'P-6206109',
    sku: 'ST-6206109',
    oem: 'ST-6206109',
    name: 'Right Rear Upper Hinge Assembly (右后门上铰链总成)',
    cnName: '右后门上铰链总成',
    arName: 'تجميعة المفصلة العلوية للباب الخلفي الأيمن',
    vehicleModel: 'BYD Seagull (海鸥)',
    brand: 'BYD Original OEM',
    categoryId: 'cat-hinges',
    costPrice: 12.00,
    unitPrice: 24.00,
    quantity: 25,
    minLevel: 8,
    location: 'Aisle 2 · Bin 10',
    supplier: 'BYD Hardware',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'P-2803411',
    sku: 'EQEA-2803411',
    oem: 'EQEA-2803411',
    name: 'Front Bumper Right Support Bracket (前保险杠右支架)',
    cnName: '前保险杠右支架',
    arName: 'حامل المصد الأمامي الأيمن',
    vehicleModel: 'BYD Seagull (海鸥)',
    brand: 'BYD Original OEM',
    categoryId: 'cat-brackets',
    costPrice: 9.00,
    unitPrice: 18.00,
    quantity: 40,
    minLevel: 10,
    location: 'Aisle 3 · Bin 01',
    supplier: 'BYD Plastics',
    lastUpdated: new Date().toISOString()
  }
];

class RelationalDatabase {
  constructor() {
    this.tables = {
      users: [],
      categories: [],
      products: [],
      orders: []
    };
    this.init();
  }

  init() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.tables = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading database file, re-initializing:', err);
        this.seedInitialData();
      }
    } else {
      this.seedInitialData();
    }

    // Ensure users exist
    if (!this.tables.users || this.tables.users.length === 0) {
      this.tables.users = seedUsers;
      this.save();
    }

    // Production Automated Backup System
    this.createBackup();
  }

  createBackup() {
    try {
      const backupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const backupFile = path.join(backupDir, `pos_database_${dateStr}.json`);

      // Write backup snapshot if not already written today
      if (!fs.existsSync(backupFile)) {
        fs.writeFileSync(backupFile, JSON.stringify(this.tables, null, 2));
        console.log(`🛡️ Production Backup Snapshot Created: ${backupFile}`);
      }
    } catch (err) {
      console.error('Backup creation failed:', err.message);
    }
  }

  seedInitialData() {
    this.tables = {
      users: seedUsers,
      categories: seedCategories,
      products: seedProducts,
      orders: []
    };
    this.save();
  }

  save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.tables, null, 2));
  }

  // Clear All Inventory & Orders (Safety Backup First)
  clearAllData() {
    this.createBackup();
    this.tables.products = [];
    this.tables.orders = [];
    this.save();
    return { products: [], orders: [] };
  }

  // User Operations
  getUsers() {
    return this.tables.users.map(({ password_hash, ...u }) => u);
  }

  findUserByUsername(username) {
    return this.tables.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  findUserById(id) {
    const user = this.tables.users.find(u => u.id === id);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  }

  createUser({ username, password, name, role }) {
    if (this.findUserByUsername(username)) {
      throw new Error(`Username '${username}' is already taken.`);
    }

    const newUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      username: username.trim(),
      password_hash: hashPassword(password),
      name: name.trim(),
      role: role || 'Cashier',
      created_at: new Date().toISOString()
    };

    this.tables.users.push(newUser);
    this.save();
    const { password_hash, ...created } = newUser;
    return created;
  }

  deleteUser(id) {
    this.tables.users = this.tables.users.filter(u => u.id !== id);
    this.save();
  }

  // Product Operations
  getProducts() {
    return this.tables.products || [];
  }

  getCategories() {
    return this.tables.categories || [];
  }

  saveProduct(productData) {
    productData.lastUpdated = new Date().toISOString();
    productData.costPrice = Math.max(0, parseFloat(productData.costPrice || 0) || 0);
    productData.unitPrice = Math.max(0, parseFloat(productData.unitPrice || 0) || 0);
    productData.quantity = Math.max(0, parseInt(productData.quantity || 0, 10) || 0);
    productData.minLevel = Math.max(0, parseInt(productData.minLevel || 5, 10) || 5);

    if (productData.id) {
      const idx = this.tables.products.findIndex(p => p.id === productData.id);
      if (idx !== -1) {
        this.tables.products[idx] = { ...this.tables.products[idx], ...productData };
      } else {
        this.tables.products.unshift(productData);
      }
    } else {
      productData.id = `P-${crypto.randomUUID().slice(0, 8)}`;
      this.tables.products.unshift(productData);
    }
    this.save();
    return this.tables.products;
  }

  adjustStock(productId, delta) {
    const prod = this.tables.products.find(p => p.id === productId);
    if (prod) {
      prod.quantity = Math.max(0, prod.quantity + delta);
      prod.lastUpdated = new Date().toISOString();
      this.save();
    }
    return this.tables.products;
  }

  deleteProduct(id) {
    this.tables.products = this.tables.products.filter(p => p.id !== id);
    this.save();
    return this.tables.products;
  }

  // VIN & Vehicle Compatibility Search
  findProductsByVin(vinQuery) {
    if (!vinQuery) return this.getProducts();
    const q = vinQuery.trim().toUpperCase();

    return this.tables.products.filter(p => {
      const oem = (p.oem || '').toUpperCase();
      const sku = (p.sku || '').toUpperCase();
      const vinP = (p.vinPattern || '').toUpperCase();
      const model = (p.vehicleModel || '').toUpperCase();
      const name = (p.name || '').toUpperCase();
      const cnName = (p.cnName || '').toUpperCase();
      const arName = (p.arName || '').toUpperCase();

      if (vinP && q.includes(vinP)) return true;
      if (oem && q.includes(oem)) return true;
      if (sku && q.includes(sku)) return true;
      if (model && q.includes(model)) return true;
      if (name.includes(q) || cnName.includes(q) || arName.includes(q)) return true;

      return false;
    });
  }

  // Order Operations
  getOrders() {
    return this.tables.orders || [];
  }

  createOrder(orderData) {
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    // Pre-validate stock availability for all items
    for (const item of orderData.items) {
      const prod = this.tables.products.find(p => p.id === item.id);
      const availableStock = prod ? Number(prod.quantity || 0) : 0;
      if (availableStock < item.qty) {
        throw new Error(`Insufficient stock for part '${item.oem || item.name}'. Available: ${availableStock}, requested: ${item.qty}`);
      }
    }

    orderData.id = `ORD-${crypto.randomUUID().slice(0, 8)}`;
    orderData.date = new Date().toISOString();
    orderData.status = 'Completed';

    // Deduct stock
    orderData.items.forEach(item => {
      const prod = this.tables.products.find(p => p.id === item.id);
      if (prod) {
        prod.quantity = Math.max(0, Number(prod.quantity || 0) - item.qty);
      }
    });

    this.tables.orders.unshift(orderData);
    this.save();
    return { order: orderData, products: this.tables.products };
  }

  returnOrder({ orderId, returnedItems, reason }) {
    const order = this.tables.orders.find(o => o.id === orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status === 'Returned') {
      throw new Error(`Order ${orderId} has already been fully returned.`);
    }

    let totalRestockedQty = 0;

    // Restock each returned item back to products table
    returnedItems.forEach(ret => {
      const prod = this.tables.products.find(p => p.id === ret.id || p.oem === ret.oem);
      const restockQty = Math.max(1, parseInt(ret.qty || 1, 10));
      if (prod) {
        prod.quantity = (Number(prod.quantity) || 0) + restockQty;
        prod.lastUpdated = new Date().toISOString();
        totalRestockedQty += restockQty;
      }
    });

    order.status = 'Returned';
    order.returnedAt = new Date().toISOString();
    order.returnReason = reason || 'Customer Return';

    this.save();
    return {
      order,
      products: this.tables.products,
      orders: this.tables.orders,
      totalRestockedQty
    };
  }

  // Batch Import
  batchImportProducts(incomingItems) {
    let updatedCount = 0;
    let createdCount = 0;
    let totalQuantityAdded = 0;

    incomingItems.forEach(incoming => {
      const incomingOem = (incoming.oem || '').trim().toLowerCase();
      const incomingSku = (incoming.sku || incoming.oem || '').trim().toLowerCase();

      const existingIdx = this.tables.products.findIndex(p => {
        if (incoming.id && p.id === incoming.id) return true;
        if (incomingOem && (p.oem || '').trim().toLowerCase() === incomingOem) return true;
        if (incomingSku && (p.sku || '').trim().toLowerCase() === incomingSku) return true;
        return false;
      });

      const incomingQty = Math.max(1, parseInt(incoming.quantity || 1, 10));

      if (existingIdx !== -1) {
        const prod = this.tables.products[existingIdx];
        prod.quantity += incomingQty;
        if (incoming.costPrice > 0) prod.costPrice = parseFloat(incoming.costPrice);
        if (incoming.unitPrice > 0) prod.unitPrice = parseFloat(incoming.unitPrice);
        if (incoming.arName) prod.arName = incoming.arName;
        if (incoming.cnName) prod.cnName = incoming.cnName;
        prod.lastUpdated = new Date().toISOString();

        updatedCount++;
        totalQuantityAdded += incomingQty;
      } else {
        const newProduct = {
          id: `P-${crypto.randomUUID().slice(0, 8)}`,
          sku: incoming.oem || incoming.sku || `SKU-${crypto.randomUUID().slice(0, 6)}`,
          oem: incoming.oem || incoming.sku || 'N/A',
          name: incoming.arName ? `${incoming.arName} (${incoming.name || incoming.cnName || ''})` : (incoming.name || incoming.cnName || 'New OEM Part'),
          arName: incoming.arName || '',
          cnName: incoming.cnName || incoming.name || '',
          vehicleModel: incoming.vehicleModel || 'BYD Seagull (海鸥)',
          yearRange: incoming.yearRange || '2023 - 2026',
          vinPattern: incoming.vinPattern || incoming.oem || '',
          brand: incoming.brand || 'BYD OEM Import',
          categoryId: incoming.categoryId || 'cat-body',
          costPrice: parseFloat(incoming.costPrice) || 20.00,
          unitPrice: parseFloat(incoming.unitPrice) || 35.00,
          quantity: incomingQty,
          minLevel: 5,
          location: incoming.location || 'Aisle 1 · Rack Import',
          supplier: incoming.supplier || 'China Direct Import',
          lastUpdated: new Date().toISOString()
        };

        this.tables.products.unshift(newProduct);
        createdCount++;
        totalQuantityAdded += incomingQty;
      }
    });

    this.save();
    return {
      products: this.tables.products,
      summary: {
        updatedCount,
        createdCount,
        totalQuantityAdded,
        totalProcessed: incomingItems.length
      }
    };
  }
}

export const db = new RelationalDatabase();
