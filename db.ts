
import { User, Customer, Service, Job, InventoryItem, CompanySettings } from './types';
import * as XLSX from 'xlsx';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Database Configuration ---
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

// --- Cloud Connectivity (Supabase) ---
// Safely access env vars to prevent "Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')"
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any)?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || (process.env as any)?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Enhanced Database Engine that synchronizes Local (IndexedDB) 
 * and Server (Supabase PostgreSQL) data streams.
 */
class DatabaseEngine {
  private localDb: IDBDatabase | null = null;

  async connectLocal(): Promise<IDBDatabase> {
    if (this.localDb) return this.localDb;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject('Local database failed to open');
      request.onsuccess = (event) => {
        this.localDb = (event.target as IDBOpenDBRequest).result;
        resolve(this.localDb);
      };
      request.onupgradeneeded = (event) => {
        const dbInstance = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(storeName => {
          if (!dbInstance.objectStoreNames.contains(storeName)) {
            dbInstance.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  async getLocalStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const dbInstance = await this.connectLocal();
    const transaction = dbInstance.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- Generic Cloud Fetcher ---
  async cloudAll<T>(table: string): Promise<T[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return data as T[];
    } catch (err) {
      console.warn(`Cloud fetch failed for table: ${table}. Falling back to local store.`);
      return null;
    }
  }

  // --- Generic Cloud Saver ---
  async cloudSave<T extends { id: string }>(table: string, item: T): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from(table).upsert(item);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Cloud save failed for table: ${table}. Data stored locally.`);
      return false;
    }
  }

  // --- Generic Cloud Deleter ---
  async cloudDelete(table: string, id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Cloud delete failed for table: ${table}.`);
      return false;
    }
  }

  // --- Public Universal API ---

  async all<T>(storeName: string): Promise<T[]> {
    // 1. Attempt Server Retrieval
    const cloudData = await this.cloudAll<T>(storeName);
    if (cloudData) {
      // Background Sync: Refresh Local Cache
      const dbInstance = await this.connectLocal();
      const transaction = dbInstance.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      cloudData.forEach(item => store.put(item));
      return cloudData;
    }

    // 2. Local Fallback (for offline or misconfigured cloud)
    const store = await this.getLocalStore(storeName);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async save<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    // 1. Store on Server
    await this.cloudSave(storeName, item);
    
    // 2. Store Locally
    const store = await this.getLocalStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(`Error saving ${storeName} locally`);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    // 1. Remove from Server
    await this.cloudDelete(storeName, id);
    
    // 2. Remove Locally
    const store = await this.getLocalStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Error deleting ${id} from local ${storeName}`);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    // 1. Try Server First
    if (supabase) {
      const { data } = await supabase.from(storeName).select('*').eq('id', id).single();
      if (data) return data as T;
    }
    
    // 2. Local Fallback
    const store = await this.getLocalStore(storeName);
    return new Promise((resolve) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }
}

const engine = new DatabaseEngine();

// --- Default Data for Bootstrapping ---
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

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Regal Jan Seva Kendra',
  mobileNumber: '+91 98765 43210',
  address: 'Shop No. 12, Main Market Road, Near Tehsil Office, Regal Chowk, India',
  ownerName: 'Admin User',
  email: 'contact@regaljsk.com',
  website: 'www.regaljsk.com'
};

// --- Exported Database API ---
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
      const users = await db.users.all();
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
                for (const item of jsonData) await engine.save(storeName, item as any);
              }
            }
            resolve(true);
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }
  },
  init: async () => {
    // 1. Establish Local Connection
    await engine.connectLocal();
    
    // 2. Bootstrap Cloud/Local with initial Admin if empty
    const users = await db.users.all();
    if (users.length === 0) {
      console.log('Provisioning default administrative credentials...');
      for (const u of DEFAULT_USERS) await db.users.save(u);
    }
    
    // 3. Ensure base configuration exists
    const currentSettings = await engine.getById(STORES.SETTINGS, 'current_config');
    if (!currentSettings) {
      await db.settings.save(DEFAULT_SETTINGS);
    }
  },
  isCloudActive: () => !!supabase
};
