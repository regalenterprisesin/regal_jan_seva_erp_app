
import { User, Customer, Service, Job, InventoryItem, CompanySettings } from './types';
import * as XLSX from 'xlsx';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// --- Database Configuration ---
const STORES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  JOBS: 'jobs',
  INVENTORY: 'inventory',
  SETTINGS: 'settings'
};

// --- Cloud Connectivity (Supabase) ---
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any)?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any)?.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

class DatabaseEngine {
  
  async all<T>(table: string): Promise<T[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return (data as T[]) || [];
    } catch (err) {
      console.error(`Error fetching from ${table}:`, err);
      return [];
    }
  }

  async save<T extends { id: string }>(table: string, item: T): Promise<T> {
    if (!supabase) throw new Error(`Supabase not configured.`);
    try {
      const { error } = await supabase.from(table).upsert(item);
      if (error) throw error;
      return item;
    } catch (err) {
      console.error(`Error saving to ${table}:`, err);
      throw err;
    }
  }

  async delete(table: string, id: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error(`Error deleting from ${table}:`, err);
      throw err;
    }
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as T) || null;
    } catch (err) {
      console.error(`Error getting item from ${table}:`, err);
      return null;
    }
  }

  // --- Real-Time Subscription Helper ---
  subscribe(table: string, callback: () => void): () => void {
    if (!supabase) return () => {};
    
    const channel: RealtimeChannel = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: table }, 
        () => {
          console.debug(`Real-time update received for table: ${table}`);
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }
}

const engine = new DatabaseEngine();

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

export const db = {
  users: {
    all: () => engine.all<User>(STORES.USERS),
    save: (user: User) => engine.save(STORES.USERS, user),
    delete: (id: string) => engine.delete(STORES.USERS, id),
    subscribe: (cb: () => void) => engine.subscribe(STORES.USERS, cb)
  },
  customers: {
    all: () => engine.all<Customer>(STORES.CUSTOMERS),
    save: (customer: Customer) => engine.save(STORES.CUSTOMERS, customer),
    delete: (id: string) => engine.delete(STORES.CUSTOMERS, id),
    subscribe: (cb: () => void) => engine.subscribe(STORES.CUSTOMERS, cb)
  },
  services: {
    all: () => engine.all<Service>(STORES.SERVICES),
    save: (service: Service) => engine.save(STORES.SERVICES, service),
    delete: (id: string) => engine.delete(STORES.SERVICES, id),
    subscribe: (cb: () => void) => engine.subscribe(STORES.SERVICES, cb)
  },
  jobs: {
    all: () => engine.all<Job>(STORES.JOBS),
    save: (job: Job) => engine.save(STORES.JOBS, job),
    delete: (id: string) => engine.delete(STORES.JOBS, id),
    subscribe: (cb: () => void) => engine.subscribe(STORES.JOBS, cb)
  },
  inventory: {
    all: () => engine.all<InventoryItem>(STORES.INVENTORY),
    save: (item: InventoryItem) => engine.save(STORES.INVENTORY, item),
    delete: (id: string) => engine.delete(STORES.INVENTORY, id),
    subscribe: (cb: () => void) => engine.subscribe(STORES.INVENTORY, cb)
  },
  settings: {
    get: async (): Promise<CompanySettings> => {
      const settings = await engine.getById<CompanySettings>(STORES.SETTINGS, 'current_config');
      return settings || DEFAULT_SETTINGS;
    },
    save: async (settings: CompanySettings) => {
      await engine.save(STORES.SETTINGS, { ...settings, id: 'current_config' });
    },
    subscribe: (cb: () => void) => engine.subscribe(STORES.SETTINGS, cb)
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
      if (!supabase) return null;
      try {
        const { data, error } = await supabase
          .from(STORES.USERS)
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .single();
        
        if (error) return null;
        return data as User;
      } catch (e) {
        return null;
      }
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
    if (!supabase) {
      console.warn("Supabase is not initialized. Database will be empty.");
      return;
    }
    try {
      const users = await db.users.all();
      if (users.length === 0) {
        for (const u of DEFAULT_USERS) await db.users.save(u);
      }
      const currentSettings = await engine.getById(STORES.SETTINGS, 'current_config');
      if (!currentSettings) {
        await db.settings.save(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error("Initialization failed:", err);
    }
  },
  isCloudActive: () => !!supabase && !!SUPABASE_URL
};
