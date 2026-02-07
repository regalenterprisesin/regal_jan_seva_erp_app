
export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type Privilege = 
  | 'MANAGE_USERS' 
  | 'VIEW_REPORTS' 
  | 'MANAGE_CUSTOMERS' 
  | 'MANAGE_SERVICES' 
  | 'MANAGE_JOBS' 
  | 'MANAGE_INVENTORY';

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  privileges: Privilege[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  aadhaarNumber: string;
  address: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
}

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface JobItem {
  serviceId: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Line item discount
  subtotal: number; // Calculated field: (qty * rate) - discount
  status: JobStatus; // Track status per service item
}

export interface Job {
  id: string;
  customerId: string;
  items: JobItem[]; // Support for multiple services
  status: JobStatus; // Overall job status (optional/sync with items)
  paymentStatus: PaymentStatus;
  discount: number; // Global discount (optional, additive to line items)
  totalAmount: number;
  paidAmount: number;
  balance: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
  category: string;
  lastUpdated: string;
}

export interface CompanySettings {
  companyName: string;
  mobileNumber: string;
  address: string;
  ownerName: string;
  email: string;
  website: string;
}
