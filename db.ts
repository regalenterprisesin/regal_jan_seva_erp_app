
import { User, Customer, Service, Job, InventoryItem, CompanySettings } from './types';
import * as XLSX from 'xlsx';

const DB_NAME = 'RegalJSK_ERP_DB';
const DB_VERSION = 1;
const STORES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  JOBS: 'jobs',
  INVENTORY: 'inventory',
  SETTINGS: 'settings'
};

/**
 * Database Engine using IndexedDB for professional-grade browser storage.
 * This replaces the previous localStorage implementation with a proper
 * transactional database system.
 */
class DatabaseEngine {
  private db: IDBDatabase | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject('Database failed to open');
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            // Create object stores with 'id' as the primary key
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.connect();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async all<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(`Error fetching from ${storeName}`);
    });
  }

  async save<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(`Error saving to ${storeName}`);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Error deleting from ${storeName}`);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(`Error getting ID from ${storeName}`);
    });
  }
}

const engine = new DatabaseEngine();

// --- Seed Data ---
const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    email: 'admin@regal-erp.com',
    password: 'password123',
    role: 'ADMIN',
    privileges: ['MANAGE_USERS', 'VIEW_REPORTS', 'MANAGE_CUSTOMERS', 'MANAGE_SERVICES', 'MANAGE_JOBS', 'MANAGE_INVENTORY']
  }
];

const DEFAULT_SERVICES: Service[] = [
  { id: 's1', name: 'Aadhaar Update', description: 'Biometric and demographic updates', basePrice: 50, category: 'UIDAI' },
  { id: 's2', name: 'PAN Card New', description: 'Application for fresh PAN card', basePrice: 150, category: 'UTI/IT' }
];

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Regal Jan Seva Kendra',
  mobileNumber: '+91 98765 43210',
  address: 'Shop No. 12, Main Market Road, Near Tehsil Office, Regal Chowk, India',
  ownerName: 'Admin User',
  email: 'contact@regaljsk.com',
  website: 'www.regaljsk.com'
};

export const db = {
  users: {
    all: () => engine.all<User>(STORES.USERS),
    save: (user: User) => engine.save(STORES.USERS, user),
    delete: (id: string) => engine.delete(STORES.USERS, id)
  },

  customers: {
    all: () => engine.all<Customer>(STORES.CUSTOMERS),
    save: (customer: Customer) => engine.save(STORES.CUSTOMERS, customer),
    delete: (id: string) => engine.delete(STORES.CUSTOMERS, id)
  },

  services: {
    all: () => engine.all<Service>(STORES.SERVICES),
    save: (service: Service) => engine.save(STORES.SERVICES, service),
    delete: (id: string) => engine.delete(STORES.SERVICES, id)
  },

  jobs: {
    all: () => engine.all<Job>(STORES.JOBS),
    save: (job: Job) => engine.save(STORES.JOBS, job),
    delete: (id: string) => engine.delete(STORES.JOBS, id)
  },

  inventory: {
    all: () => engine.all<InventoryItem>(STORES.INVENTORY),
    save: (item: InventoryItem) => engine.save(STORES.INVENTORY, item),
    delete: (id: string) => engine.delete(STORES.INVENTORY, id)
  },

  settings: {
    get: async (): Promise<CompanySettings> => {
      const settings = await engine.getById<CompanySettings>(STORES.SETTINGS, 'current_config');
      return settings || DEFAULT_SETTINGS;
    },
    save: async (settings: CompanySettings) => {
      // Use a fixed ID to persist singular settings object
      await engine.save(STORES.SETTINGS, { ...settings, id: 'current_config' });
    }
  },

  auth: {
    getSession: async (): Promise<User | null> => {
      const storedId = localStorage.getItem('regal_erp_session_id');
      if (!storedId) return null;
      return engine.getById<User>(STORES.USERS, storedId);
    },
    setSession: (user: User | null) => {
      if (user) {
        localStorage.setItem('regal_erp_session_id', user.id);
      } else {
        localStorage.removeItem('regal_erp_session_id');
      }
    },
    login: async (username: string, password: string): Promise<User | null> => {
      const users = await engine.all<User>(STORES.USERS);
      return users.find(u => u.username === username && u.password === password) || null;
    }
  },

  system: {
    backup: async () => {
      const workbook = XLSX.utils.book_new();
      for (const storeName of Object.values(STORES)) {
        const data = await engine.all(storeName);
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, storeName);
      }
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `regal_erp_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    },
    restore: async (file: File): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            for (const storeName of Object.values(STORES)) {
              const sheet = workbook.Sheets[storeName];
              if (sheet) {
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
                for (const item of jsonData) {
                  await engine.save(storeName, item as any);
                }
              }
            }
            resolve(true);
          } catch (err) {
            console.error("Database restore failed", err);
            reject(err);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }
  },

  init: async () => {
    // Connect to IndexedDB engine
    await engine.connect();
    
    // Seed initial data if database is empty
    const users = await db.users.all();
    if (users.length === 0) {
      for (const u of DEFAULT_USERS) await db.users.save(u);
    }
    const services = await db.services.all();
    if (services.length === 0) {
      for (const s of DEFAULT_SERVICES) await db.services.save(s);
    }
    const settings = await engine.getById(STORES.SETTINGS, 'current_config');
    if (!settings) {
      await db.settings.save(DEFAULT_SETTINGS);
    }
  },

  isCloudActive: () => false
};
