
import { User, Customer, Service, Job, InventoryItem, CompanySettings } from './types';
import * as XLSX from 'xlsx';

const COLLECTIONS = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  JOBS: 'jobs',
  INVENTORY: 'inventory',
  SETTINGS: 'settings'
};

// --- Storage Helpers ---
const storage = {
  get: <T>(key: string): T[] => {
    const data = localStorage.getItem(`regal_erp_${key}`);
    return data ? JSON.parse(data) : [];
  },
  set: <T>(key: string, data: T[]) => {
    localStorage.setItem(`regal_erp_${key}`, JSON.stringify(data));
  },
  save: <T extends { id: string }>(key: string, item: T) => {
    const items = storage.get<T>(key);
    const index = items.findIndex(i => i.id === item.id);
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    storage.set(key, items);
  },
  remove: (key: string, id: string) => {
    const items = storage.get<any>(key);
    storage.set(key, items.filter((i: any) => i.id !== id));
  }
};

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
    all: async () => storage.get<User>(COLLECTIONS.USERS),
    save: async (user: User) => storage.save(COLLECTIONS.USERS, user),
    delete: async (id: string) => storage.remove(COLLECTIONS.USERS, id)
  },

  customers: {
    all: async () => storage.get<Customer>(COLLECTIONS.CUSTOMERS),
    save: async (customer: Customer) => storage.save(COLLECTIONS.CUSTOMERS, customer),
    delete: async (id: string) => storage.remove(COLLECTIONS.CUSTOMERS, id)
  },

  services: {
    all: async () => storage.get<Service>(COLLECTIONS.SERVICES),
    save: async (service: Service) => storage.save(COLLECTIONS.SERVICES, service),
    delete: async (id: string) => storage.remove(COLLECTIONS.SERVICES, id)
  },

  jobs: {
    all: async () => storage.get<Job>(COLLECTIONS.JOBS),
    save: async (job: Job) => storage.save(COLLECTIONS.JOBS, job),
    delete: async (id: string) => storage.remove(COLLECTIONS.JOBS, id)
  },

  inventory: {
    all: async () => storage.get<InventoryItem>(COLLECTIONS.INVENTORY),
    save: async (item: InventoryItem) => storage.save(COLLECTIONS.INVENTORY, item),
    delete: async (id: string) => storage.remove(COLLECTIONS.INVENTORY, id)
  },

  settings: {
    get: async (): Promise<CompanySettings> => {
      const data = localStorage.getItem(`regal_erp_${COLLECTIONS.SETTINGS}`);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    },
    save: async (settings: CompanySettings) => {
      localStorage.setItem(`regal_erp_${COLLECTIONS.SETTINGS}`, JSON.stringify(settings));
    }
  },

  auth: {
    getSession: async (): Promise<User | null> => {
      const storedId = localStorage.getItem('regal_erp_session_id');
      if (!storedId) return null;
      const users = await db.users.all();
      return users.find(u => u.id === storedId) || null;
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
      for (const [key, value] of Object.entries(COLLECTIONS)) {
        if (key === 'SETTINGS') {
          const settings = await db.settings.get();
          const worksheet = XLSX.utils.json_to_sheet([settings]);
          XLSX.utils.book_append_sheet(workbook, worksheet, value);
          continue;
        }
        const data = storage.get(value);
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, value);
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
            
            // Check if the workbook contains at least some of our expected sheets
            const sheetNames = workbook.SheetNames;
            const validSheets = Object.values(COLLECTIONS).filter(name => sheetNames.includes(name));
            
            if (validSheets.length === 0) {
              throw new Error("Invalid backup: No recognizable ERP data sheets found.");
            }

            // Iterate through our defined collections and restore if matching sheet exists
            for (const collectionName of Object.values(COLLECTIONS)) {
              const sheet = workbook.Sheets[collectionName];
              if (sheet) {
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
                if (collectionName === COLLECTIONS.SETTINGS) {
                  if (jsonData.length > 0) {
                    localStorage.setItem(`regal_erp_${COLLECTIONS.SETTINGS}`, JSON.stringify(jsonData[0]));
                  }
                  continue;
                }
                const sanitizedData = jsonData.filter(item => item !== null && typeof item === 'object');
                storage.set(collectionName, sanitizedData);
              }
            }
            resolve(true);
          } catch (err) {
            console.error("Restore process failed:", err);
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('File Reader: Encountered an error while reading the Excel file.'));
        reader.readAsArrayBuffer(file);
      });
    }
  },

  init: async () => {
    const users = await db.users.all();
    if (users.length === 0) {
      for (const u of DEFAULT_USERS) await db.users.save(u);
    }
    const services = await db.services.all();
    if (services.length === 0) {
      for (const s of DEFAULT_SERVICES) await db.services.save(s);
    }
    const currentSettings = localStorage.getItem(`regal_erp_${COLLECTIONS.SETTINGS}`);
    if (!currentSettings) {
      await db.settings.save(DEFAULT_SETTINGS);
    }
  },

  isCloudActive: () => false
};
