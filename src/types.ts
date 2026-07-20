export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  image: string;
  description?: string;
  rating?: number;
  ratingCount?: number;
  specifications?: Record<string, string>;
  reviews?: Array<{
    id: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  qty: number;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  county: string;
  points?: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  customer: Customer;
  payment: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  notes: string;
  date: string;
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeEmail: string;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  lowStockThreshold: number;
  seasonalThemeEnabled?: boolean;
  lowStockEmailEnabled?: boolean;
  adminEmailForNotifications?: string;
}

export interface CategoryMeta {
  key: string;
  label: string;
  icon: string;
  gated?: boolean;
}

export type AdminRole = 'superadmin' | 'editor' | 'viewer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: AdminRole;
  createdAt: string;
}

