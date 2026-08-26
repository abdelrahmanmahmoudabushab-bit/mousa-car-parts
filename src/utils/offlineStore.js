/**
 * Mousa Car Parts - Offline Resilience & IndexedDB Backup Engine
 * Caches catalog, inventory levels, and queues sales transactions when internet drops.
 * Automatically syncs queued sales to the server backend upon reconnection.
 */

const DB_NAME = 'mousa_pos_offline_db';
const DB_VERSION = 1;
const STORE_PRODUCTS = 'products_cache';
const STORE_OFFLINE_ORDERS = 'offline_orders_queue';

// Open or initialize IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null); // Fallback to localStorage
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OFFLINE_ORDERS)) {
        db.createObjectStore(STORE_OFFLINE_ORDERS, { keyPath: 'tempId' });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Cache full product catalog locally
 */
export async function cacheProductsLocally(products) {
  if (!products || !Array.isArray(products)) return;
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORE_PRODUCTS);
      store.clear();
      products.forEach(p => store.put(p));
    }
    // Backup to localStorage for extra reliability
    localStorage.setItem('mousa_products_backup', JSON.stringify(products));
    localStorage.setItem('mousa_last_cache_time', new Date().toISOString());
  } catch (err) {
    console.warn('IndexedDB cache error, fallback to localStorage:', err);
    try {
      localStorage.setItem('mousa_products_backup', JSON.stringify(products));
    } catch (e) {}
  }
}

/**
 * Retrieve product catalog when offline
 */
export async function getLocalProductsCache() {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_PRODUCTS, 'readonly');
      const store = tx.objectStore(STORE_PRODUCTS);
      const req = store.getAll();
      const dbProducts = await new Promise(res => req.onsuccess = () => res(req.result));
      if (dbProducts && dbProducts.length > 0) {
        return dbProducts;
      }
    }
  } catch (e) {}

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem('mousa_products_backup');
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Queue a completed sale order when offline
 */
export async function queueOfflineOrder(orderData) {
  const tempId = `off_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const payload = {
    ...orderData,
    tempId,
    offlineTimestamp: new Date().toISOString(),
    isOfflineQueued: true
  };

  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_OFFLINE_ORDERS, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_ORDERS);
      store.put(payload);
    }
  } catch (e) {}

  // Save to localStorage queue
  try {
    const queue = JSON.parse(localStorage.getItem('mousa_offline_queue') || '[]');
    queue.push(payload);
    localStorage.setItem('mousa_offline_queue', JSON.stringify(queue));
  } catch (e) {}

  return payload;
}

/**
 * Get count of pending offline orders
 */
export async function getPendingOfflineOrdersCount() {
  try {
    const queue = JSON.parse(localStorage.getItem('mousa_offline_queue') || '[]');
    return queue.length;
  } catch (e) {
    return 0;
  }
}

/**
 * Automatically sync offline orders to server when back online
 */
export async function syncOfflineOrdersQueue(token) {
  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem('mousa_offline_queue') || '[]');
  } catch (e) {
    return { synced: 0, failed: 0 };
  }

  if (queue.length === 0) return { synced: 0, failed: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue = [];

  for (const order of queue) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        syncedCount++;
      } else {
        remainingQueue.push(order);
        failedCount++;
      }
    } catch (err) {
      remainingQueue.push(order);
      failedCount++;
    }
  }

  // Update localStorage queue with unsynced orders
  localStorage.setItem('mousa_offline_queue', JSON.stringify(remainingQueue));

  // Also update IndexedDB
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_OFFLINE_ORDERS, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_ORDERS);
      store.clear();
      remainingQueue.forEach(o => store.put(o));
    }
  } catch (e) {}

  return { synced: syncedCount, failed: failedCount };
}
