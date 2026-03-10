/**
 * IndexedDB wrapper for offline-first data storage
 */

const DB_NAME = 'ddobak-math';
const DB_VERSION = 1;

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Users
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }

      // Play logs
      if (!db.objectStoreNames.contains('play_logs')) {
        const store = db.createObjectStore('play_logs', { keyPath: 'log_id', autoIncrement: true });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('concept_id', 'concept_id', { unique: false });
        store.createIndex('played_at', 'played_at', { unique: false });
      }

      // Mastery
      if (!db.objectStoreNames.contains('mastery')) {
        const store = db.createObjectStore('mastery', { keyPath: ['user_id', 'concept_id'] });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('mastery_level', 'mastery_level', { unique: false });
      }

      // Coins
      if (!db.objectStoreNames.contains('coins')) {
        db.createObjectStore('coins', { keyPath: 'user_id' });
      }

      // Transactions
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'tx_id', autoIncrement: true });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Exchange requests
      if (!db.objectStoreNames.contains('exchange_requests')) {
        const store = db.createObjectStore('exchange_requests', { keyPath: 'request_id', autoIncrement: true });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // Shop items
      if (!db.objectStoreNames.contains('shop_items')) {
        const store = db.createObjectStore('shop_items', { keyPath: 'item_id', autoIncrement: true });
        store.createIndex('user_id', 'user_id', { unique: false });
      }

      // Settings (key-value)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

/** Generic CRUD operations */
export const storage = {
  async get(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async add(storeName, record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName, indexName, range) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const req = range ? target.getAll(range) : target.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async count(storeName, indexName, range) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const req = range ? target.count(range) : target.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async clear(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  /** Get a setting value (returns default if not found) */
  async getSetting(key, defaultValue = null) {
    const record = await this.get('settings', key);
    return record ? record.value : defaultValue;
  },

  /** Set a setting value */
  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }
};

/**
 * Initialize default data for first-time users
 */
export async function initializeDefaultData() {
  const user = await storage.get('users', 'default');
  if (user) return; // Already initialized

  // Create default user
  await storage.put('users', {
    user_id: 'default',
    name: '',
    grade: 1,
    semester: 1,
    avatar: '🧒',
    created_at: Date.now()
  });

  // Create default coins
  await storage.put('coins', {
    user_id: 'default',
    balance: 0,
    total_earned: 0,
    total_spent: 0,
    daily_earned: 0,
    daily_date: new Date().toDateString()
  });

  // Create default shop items
  const defaultItems = [
    { user_id: 'default', name: '초코칩 쿠키', price: 50, emoji: '🍪', is_active: true },
    { user_id: 'default', name: '막대 사탕', price: 30, emoji: '🍭', is_active: true },
    { user_id: 'default', name: '초코바', price: 100, emoji: '🍫', is_active: true },
    { user_id: 'default', name: '젤리', price: 40, emoji: '🍬', is_active: true },
    { user_id: 'default', name: '아이스크림', price: 150, emoji: '🍦', is_active: true }
  ];

  for (const item of defaultItems) {
    await storage.add('shop_items', item);
  }

  // Default settings
  await storage.setSetting('daily_coin_limit', 50);
  await storage.setSetting('play_time_limit', 30);
  await storage.setSetting('sound_enabled', true);
  await storage.setSetting('pin', null);
}
