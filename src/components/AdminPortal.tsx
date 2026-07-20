import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard, Boxes, Receipt, Users, PieChart, Settings, 
  Store, LogOut, Plus, RotateCw, Search, Eye, Check, CheckCheck, 
  X, Trash2, Edit3, Save, Printer, Key, ShieldCheck, ArrowRight,
  TrendingUp, AlertTriangle, FileText, ChevronRight, Upload, Star, Download
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { Product, Order, StoreSettings, AdminUser, AdminRole } from '../types';
import { formatMoney, formatDate, calcDiscount, uid, categoryMeta } from '../data/catalog';
import { useEffect } from 'react';

interface AdminPortalProps {
  products: Product[];
  orders: Order[];
  settings: StoreSettings;
  onProductsChange: (newProducts: Product[]) => void;
  onOrdersChange: (newOrders: Order[]) => void;
  onSettingsChange: (newSettings: StoreSettings) => void;
  isLoggedIn: boolean;
  loggedInUser: AdminUser | null;
  onLogin: (user: AdminUser) => void;
  onLogout: () => void;
  onBackToShop?: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  adminAlerts?: Array<{
    id: string;
    productName: string;
    stock: number;
    timestamp: string;
    sentTo: string;
  }>;
  onTriggerLowStockEmail?: (productName: string, stock: number) => void;
}

type AdminPage = 'dashboard' | 'products' | 'orders' | 'customers' | 'reports' | 'settings' | 'analytics' | 'users';

export default function AdminPortal({
  products,
  orders,
  settings,
  onProductsChange,
  onOrdersChange,
  onSettingsChange,
  isLoggedIn,
  loggedInUser,
  onLogin,
  onLogout,
  onBackToShop,
  onShowToast,
  adminAlerts = [],
  onTriggerLowStockEmail
}: AdminPortalProps) {
  // Navigation
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  
  // Login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Admin users management state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState<AdminRole>('editor');
  const [userFormPassword, setUserFormPassword] = useState('');

  // Fetch admin users on active page change
  useEffect(() => {
    if (activePage === 'users' && loggedInUser?.role === 'superadmin') {
      fetchAdminUsers();
    }
  }, [activePage, loggedInUser]);

  const fetchAdminUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      } else {
        onShowToast('Failed to load administrator list.', 'error');
      }
    } catch (e) {
      console.error(e);
      onShowToast('Network error loading administrators.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenUserModal = (user: AdminUser | null = null) => {
    if (user) {
      setEditingUser(user);
      setUserFormName(user.name);
      setUserFormEmail(user.email);
      setUserFormRole(user.role);
      setUserFormPassword('••••••••');
    } else {
      setEditingUser(null);
      setUserFormName('');
      setUserFormEmail('');
      setUserFormRole('editor');
      setUserFormPassword('');
    }
    setUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim() || !userFormEmail.trim() || !userFormPassword) {
      onShowToast('Please fill out all required fields.', 'error');
      return;
    }

    const payload = {
      name: userFormName,
      email: userFormEmail,
      role: userFormRole,
      password: userFormPassword
    };

    try {
      if (editingUser) {
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          onShowToast('Administrator updated successfully!', 'success');
          setUserModalOpen(false);
          fetchAdminUsers();
        } else {
          const err = await res.json();
          onShowToast(err.error || 'Failed to update administrator.', 'error');
        }
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          onShowToast('Administrator created successfully!', 'success');
          setUserModalOpen(false);
          fetchAdminUsers();
        } else {
          const err = await res.json();
          onShowToast(err.error || 'Failed to create administrator.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast('Error saving administrator details.', 'error');
    }
  };

  const handleUserDelete = async (id: string) => {
    if (id === 'u-1') {
      onShowToast('Cannot delete primary system superadmin.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this administrator?')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onShowToast('Administrator deleted successfully.', 'success');
        fetchAdminUsers();
      } else {
        const err = await res.json();
        onShowToast(err.error || 'Failed to delete administrator.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Error deleting administrator.', 'error');
    }
  };

  // Search & Filter
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('all');

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Product form fields
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodOriginalPrice, setProdOriginalPrice] = useState(0);
  const [prodStock, setProdStock] = useState(0);
  const [prodImage, setProdImage] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodSpecifications, setProdSpecifications] = useState('');
  const [internalOrderNotes, setInternalOrderNotes] = useState('');

  // Settings form fields
  const [setStoreName, setSetStoreName] = useState(settings.storeName);
  const [setStorePhone, setSetStorePhone] = useState(settings.storePhone);
  const [setStoreEmail, setSetStoreEmail] = useState(settings.storeEmail);
  const [setFreeThreshold, setSetFreeThreshold] = useState(settings.freeDeliveryThreshold);
  const [setFee, setSetFee] = useState(settings.deliveryFee);
  const [setLowStock, setSetLowStock] = useState(settings.lowStockThreshold);
  const [setSeasonalTheme, setSetSeasonalTheme] = useState(settings.seasonalThemeEnabled ?? true);
  const [setLowStockEmailEnabled, setSetLowStockEmailEnabled] = useState(settings.lowStockEmailEnabled ?? false);
  const [setAdminEmailForNotifications, setSetAdminEmailForNotifications] = useState(settings.adminEmailForNotifications ?? 'admin@kipchimatt.co.ke');

  // --- Login Handler ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      onShowToast('Please provide both email and password.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      if (res.ok) {
        const user: AdminUser = await res.json();
        onLogin(user);
        onShowToast(`Welcome back, ${user.name}! Access granted.`, 'success');
      } else {
        const err = await res.json();
        onShowToast(err.error || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Connection failed. Please verify server state.', 'error');
    }
  };

  // --- Product CRUD handlers ---
  const handleOpenProductModal = (prod: Product | null = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProdName(prod.name);
      setProdBrand(prod.brand);
      setProdCategory(prod.category);
      setProdPrice(prod.price);
      setProdOriginalPrice(prod.originalPrice || 0);
      setProdStock(prod.stock);
      setProdImage(prod.image);
      setProdDescription(prod.description || '');
      setProdSpecifications(prod.specifications ? Object.entries(prod.specifications).map(([k, v]) => `${k}: ${v}`).join('\n') : '');
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdBrand('');
      setProdCategory('');
      setProdPrice(0);
      setProdOriginalPrice(0);
      setProdStock(0);
      setProdImage('');
      setProdDescription('');
      setProdSpecifications('');
    }
    setProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInUser?.role === 'viewer') {
      onShowToast('Access Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!prodName.trim() || !prodCategory) {
      onShowToast('Please fill out all required fields.', 'error');
      return;
    }

    const parsedSpecs: Record<string, string> = {};
    if (prodSpecifications.trim()) {
      prodSpecifications.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          if (key && val) {
            parsedSpecs[key] = val;
          }
        }
      });
    }

    let updatedList = [...products];
    const payload = {
      name: prodName.trim(),
      brand: prodBrand.trim() || 'Kipchimatt',
      category: prodCategory,
      price: Number(prodPrice),
      originalPrice: Number(prodOriginalPrice) || 0,
      stock: Number(prodStock),
      image: prodImage.trim() || 'https://via.placeholder.com/400?text=Kipchimatt',
      description: prodDescription.trim(),
      specifications: parsedSpecs
    };

    if (editingProduct) {
      updatedList = updatedList.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p);
      onShowToast(`Product "${payload.name}" updated.`, 'success');
    } else {
      const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
      updatedList.push({ id: maxId + 1, ...payload });
      onShowToast(`Product "${payload.name}" added successfully.`, 'success');
    }

    onProductsChange(updatedList);
    setProductModalOpen(false);
  };

  const handleDeleteProduct = (id: number) => {
    if (loggedInUser?.role === 'viewer') {
      onShowToast('Access Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this product?')) {
      const updatedList = products.filter(p => p.id !== id);
      onProductsChange(updatedList);
      onShowToast('Product deleted.', 'success');
    }
  };

  // --- Product Image upload handling (Base64 conversion) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Please upload a valid image file.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Image exceeds 2MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProdImage(reader.result);
        onShowToast('Image uploaded successfully.', 'success');
      }
    };
    reader.onerror = () => onShowToast('Failed to read image file.', 'error');
    reader.readAsDataURL(file);
  };

  // --- Order status modification ---
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    if (loggedInUser?.role === 'viewer') {
      onShowToast('Access Denied: Viewer role is read-only.', 'error');
      return;
    }
    const updatedList = orders.map(o => o.id === orderId ? { ...o, status } : o);
    onOrdersChange(updatedList);
    onShowToast(`Order #${orderId.slice(-6)} updated to "${status}".`, 'success');
  };

  const handleSaveOrderNotes = () => {
    if (loggedInUser?.role === 'viewer') {
      onShowToast('Access Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!viewingOrder) return;
    const updatedList = orders.map(o => o.id === viewingOrder.id ? { ...o, notes: internalOrderNotes } : o);
    onOrdersChange(updatedList);
    setViewingOrder(prev => prev ? { ...prev, notes: internalOrderNotes } : null);
    onShowToast('Staff internal notes saved.', 'success');
  };

  // --- Settings save ---
  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInUser?.role !== 'superadmin') {
      onShowToast('Access Denied: Super Admin role is required.', 'error');
      return;
    }
    const payload: StoreSettings = {
      storeName: setStoreName.trim(),
      storePhone: setStorePhone.trim(),
      storeEmail: setStoreEmail.trim(),
      freeDeliveryThreshold: Number(setFreeThreshold),
      deliveryFee: Number(setFee),
      lowStockThreshold: Number(setLowStock),
      seasonalThemeEnabled: setSeasonalTheme,
      lowStockEmailEnabled: setLowStockEmailEnabled,
      adminEmailForNotifications: setAdminEmailForNotifications.trim()
    };
    onSettingsChange(payload);
    onShowToast('Store settings updated. All storefront layers updated.', 'success');
  };

  // --- Export to CSV ---
  const handleExportCSV = () => {
    if (orders.length === 0) {
      onShowToast('No orders found to export!', 'error');
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Address',
      'City',
      'County',
      'Payment Method',
      'Items Count',
      'Subtotal',
      'Delivery Fee',
      'Total Amount',
      'Status',
      'Notes'
    ];

    const rows = orders.map(o => {
      // Escape commas & quotes in string fields
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      const itemCount = o.items.reduce((sum, item) => sum + item.qty, 0);
      
      return [
        o.id,
        o.date,
        escape(o.customer.name),
        escape(o.customer.phone),
        escape(o.customer.email),
        escape(o.customer.address),
        escape(o.customer.city),
        escape(o.customer.county),
        o.payment,
        itemCount,
        o.subtotal,
        o.deliveryFee,
        o.total,
        o.status,
        escape(o.notes)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kipchimatt_orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV exported successfully for accounting purposes.', 'success');
  };

  // --- Receipt Print layout launcher ---
  const handlePrintReceipt = (o: Order) => {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) {
      onShowToast('Please enable pop-ups to print receipts.', 'error');
      return;
    }

    const itemRows = o.items.map(item => `
      <tr>
        <td style="padding: 6px 0;">${item.name}</td>
        <td style="padding: 6px 0; text-align: center;">x${item.qty}</td>
        <td style="padding: 6px 0; text-align: right;">${formatMoney(item.price * item.qty)}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Kipchimatt Supermarket - Receipt #${o.id.slice(-6)}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1F2937; margin: 0; line-height: 1.5; }
            h2 { margin: 0 0 4px; text-align: center; color: #782045; }
            .store-info { text-align: center; font-size: 11px; color: #6B7280; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #E5E7EB; margin: 12px 0; }
            .metadata { font-size: 12px; margin-bottom: 12px; }
            .section-title { font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { border-bottom: 2px solid #E5E7EB; font-size: 11px; text-transform: uppercase; color: #6B7280; text-align: left; padding-bottom: 4px; }
            td { font-size: 12px; }
            .total-row { font-weight: bold; font-size: 14px; color: #782045; }
            .footer-msg { text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h2>${settings.storeName}</h2>
          <div class="store-info">${settings.storePhone} &middot; ${settings.storeEmail}</div>
          <div class="divider"></div>
          <div class="metadata">
            <strong>Order ID:</strong> #${o.id}<br>
            <strong>Date:</strong> ${formatDate(o.date)}<br>
            <strong>Payment Method:</strong> ${o.payment.toUpperCase()}<br>
            <strong>Status:</strong> ${o.status.toUpperCase()}
          </div>
          <div class="divider"></div>
          <div class="section-title">Customer Details</div>
          <div class="metadata">
            Name: ${o.customer.name}<br>
            Phone: ${o.customer.phone}<br>
            Delivery Address: ${o.customer.address}, ${o.customer.city}, ${o.customer.county}
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr>
                <td colspan="2" style="padding: 12px 0 4px; border-top: 1px dashed #E5E7EB;">Subtotal</td>
                <td style="padding: 12px 0 4px; border-top: 1px dashed #E5E7EB; text-align: right;">${formatMoney(o.subtotal)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 4px 0 12px;">Delivery Fee</td>
                <td style="padding: 4px 0 12px; text-align: right;">${o.deliveryFee > 0 ? formatMoney(o.deliveryFee) : 'FREE'}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="padding: 8px 0; border-top: 1px solid #1F2937;">TOTAL PAID</td>
                <td style="padding: 8px 0; border-top: 1px solid #1F2937; text-align: right;">${formatMoney(o.total)}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer-msg">Thank you for shopping with ${settings.storeName}! Delivered fresh & fast.</div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  // --- Calculate stats for Dashboard & Reports ---
  const getTop5SellingProducts = () => {
    const soldMap: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          soldMap[item.name] = (soldMap[item.name] || 0) + item.qty;
        });
      }
    });
    const list = Object.entries(soldMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    if (list.length === 0) {
      return products.slice(0, 5).map(p => ({
        name: p.name,
        qty: Math.floor(((p.id * 7) % 15) + 3)
      }));
    }
    return list;
  };

  const getLowestStockProducts = () => {
    return [...products]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        stock: p.stock
      }));
  };

  const totalRevenue = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total : sum, 0);
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
  const lowStockAlerts = products.filter(p => p.stock <= settings.lowStockThreshold);

  // Generate Recharts last 7 days chart data
  const getLast7DaysData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    return days.map(d => {
      const dayStr = d.toDateString();
      const dayOrders = orders.filter(o => new Date(o.date).toDateString() === dayStr && o.status !== 'cancelled');
      const sales = dayOrders.reduce((s, o) => s + o.total, 0);
      return {
        name: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        Sales: sales
      };
    });
  };

  // Calculate top-selling items map
  const getTopSellingProducts = () => {
    const soldMap: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          soldMap[item.name] = (soldMap[item.name] || 0) + item.qty;
        });
      }
    });
    return Object.entries(soldMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  };

  // Status breakdown percentages
  const getOrderStatusPercentages = () => {
    const statuses = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
    const total = orders.length || 1;
    return Object.entries(statuses).map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / total) * 100)
    }));
  };

  // Category sales breakdown
  const getCategorySalesBreakdown = () => {
    const catMap: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          const pObj = products.find(p => p.id === item.id);
          const cat = pObj ? pObj.category : 'other';
          catMap[cat] = (catMap[cat] || 0) + (item.price * item.qty);
        });
      }
    });
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  };

  // 30 days daily revenue trends data
  const get30DaysRevenueData = () => {
    const data = [];
    const now = new Date();
    
    // Group sales by date string
    const dailySales: Record<string, { revenue: number, count: number }> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        const oDate = new Date(o.date);
        if (oDate >= thirtyDaysAgo) {
          const dateStr = oDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
          if (!dailySales[dateStr]) {
            dailySales[dateStr] = { revenue: 0, count: 0 };
          }
          dailySales[dateStr].revenue += o.total;
          dailySales[dateStr].count += 1;
        }
      }
    });

    // Generate continuous sequence for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
      const record = dailySales[dateStr] || { revenue: 0, count: 0 };
      data.push({
        name: dateStr,
        Revenue: record.revenue,
        Orders: record.count
      });
    }

    return data;
  };

  // 30 days top-selling products by quantity
  const get30DaysTopSellingProducts = () => {
    const productCounts: Record<number, { name: string, qty: number, sales: number }> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    orders.forEach(o => {
      const oDate = new Date(o.date);
      if (oDate >= thirtyDaysAgo && o.status !== 'cancelled') {
        o.items.forEach(item => {
          if (!productCounts[item.id]) {
            productCounts[item.id] = { name: item.name, qty: 0, sales: 0 };
          }
          productCounts[item.id].qty += item.qty;
          productCounts[item.id].sales += item.qty * item.price;
        });
      }
    });

    return Object.values(productCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  };

  const getFilteredOrders = () => {
    if (orderFilter === 'all') return orders;
    return orders.filter(o => o.status === orderFilter);
  };

  // Filter products catalog inside inventory list
  const getFilteredAdminProducts = () => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  };

  // --- Render Login Panel ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-plum to-plum-dark rounded-2xl my-4 max-w-7xl mx-auto shadow-2xl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-white/10 select-none">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-plum/10 text-plum flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-plum">Kipchimatt Admin</h2>
            <p className="text-gray-400 text-xs font-semibold mt-1 uppercase tracking-wider">Supermarket Management Portal</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Administrative Email</label>
              <input 
                type="email" 
                required 
                placeholder="Enter admin email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-plum/20 focus:border-plum outline-none font-medium text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Password</label>
              <input 
                type="password" 
                required 
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-plum/20 focus:border-plum outline-none font-medium text-sm transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-plum hover:bg-plum-dark text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <Key className="w-4 h-4" />
              <span>Sign In Securely</span>
            </button>
          </form>

          <div className="mt-8 text-center bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Available Administrative Roles</p>
            <div className="text-left space-y-2 text-xs">
              <div className="p-2 bg-purple-50 rounded border border-purple-100">
                <span className="font-extrabold text-purple-700 text-[10px] uppercase tracking-wider block">Super Admin (Full Access)</span>
                <p className="text-gray-600 font-medium">Email: <span className="font-bold">superadmin@kipchimatt.co.ke</span></p>
                <p className="text-gray-600 font-medium">Password: <span className="font-bold">superadmin123</span></p>
              </div>
              <div className="p-2 bg-blue-50 rounded border border-blue-100">
                <span className="font-extrabold text-blue-700 text-[10px] uppercase tracking-wider block">Editor (Catalog & Stock Only)</span>
                <p className="text-gray-600 font-medium">Email: <span className="font-bold">editor@kipchimatt.co.ke</span></p>
                <p className="text-gray-600 font-medium">Password: <span className="font-bold">editor123</span></p>
              </div>
              <div className="p-2 bg-gray-100 rounded border border-gray-200">
                <span className="font-extrabold text-gray-700 text-[10px] uppercase tracking-wider block">Viewer (Read-Only)</span>
                <p className="text-gray-600 font-medium">Email: <span className="font-bold">viewer@kipchimatt.co.ke</span></p>
                <p className="text-gray-600 font-medium">Password: <span className="font-bold">viewer123</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Dashboard App Layout ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white border border-gray-150 rounded-2xl p-3 lg:p-5 shadow-sm h-fit">
        <div className="hidden lg:flex items-center gap-3 border-b border-gray-100 pb-4 mb-4 select-none">
          <div className="w-9 h-9 rounded-full bg-plum text-white flex items-center justify-center font-black text-sm shadow-sm uppercase">
            {loggedInUser?.name ? loggedInUser.name.slice(0, 2) : 'AD'}
          </div>
          <div>
            <h4 className="font-extrabold text-gray-800 text-sm leading-tight">{loggedInUser?.name || 'Admin Console'}</h4>
            <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">
              {loggedInUser?.role === 'superadmin' ? 'Super Admin' : loggedInUser?.role === 'editor' ? 'Catalog Editor' : 'Read-Only Viewer'}
            </p>
          </div>
        </div>

        {/* Horizontal Navigation scroll on mobile/tablet, vertical on desktop */}
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none w-full shrink-0">
          <button 
            onClick={() => setActivePage('dashboard')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'dashboard' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Overview</span>
          </button>

          <button 
            onClick={() => setActivePage('products')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'products' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Boxes className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Inventory</span>
            <span className={`ml-1 lg:ml-auto text-[9px] lg:text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${activePage === 'products' ? 'bg-white/20 text-white' : 'bg-gray-150 text-gray-500'}`}>
              {products.length}
            </span>
          </button>

          <button 
            onClick={() => setActivePage('orders')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'orders' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Receipt className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Orders</span>
            {activeOrders.length > 0 && (
              <span className={`ml-1 lg:ml-auto text-[9px] lg:text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${activePage === 'orders' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                {activeOrders.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActivePage('customers')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'customers' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Customers</span>
          </button>

          <button 
            onClick={() => setActivePage('reports')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'reports' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <PieChart className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Reports</span>
          </button>

          <button 
            onClick={() => setActivePage('analytics')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'analytics' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-500 animate-pulse" />
            <span className="text-gray-800 dark:text-gray-200">Analytics</span>
          </button>

          {loggedInUser?.role === 'superadmin' && (
            <button 
              onClick={() => setActivePage('users')}
              className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'users' ? 'bg-plum text-white shadow-sm font-extrabold border border-plum/10' : 'text-purple-700 hover:bg-purple-50 hover:text-purple-800'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-purple-600" />
              <span>Staff</span>
            </button>
          )}

          <button 
            onClick={() => setActivePage('settings')}
            className={`flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer ${activePage === 'settings' ? 'bg-plum text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Store Settings</span>
          </button>

          <div className="flex flex-row lg:flex-col gap-1 border-l lg:border-l-0 lg:border-t border-gray-150 pl-2 ml-1 lg:pl-0 lg:ml-0 lg:mt-3 lg:pt-3 shrink-0">
            <button 
              onClick={() => {
                if (onBackToShop) onBackToShop();
              }}
              className="flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-plum-dark"
            >
              <Store className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-plum" />
              <span className="hidden sm:inline lg:inline">Storefront</span>
              <span className="sm:hidden lg:hidden">Shop</span>
            </button>

            <button 
              onClick={() => {
                if (onLogout) onLogout();
              }}
              className="flex items-center gap-2 lg:gap-3 shrink-0 px-3 lg:px-4 py-2 rounded-lg text-[11px] lg:text-xs font-bold transition-all cursor-pointer text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-6">
        
        {/* Page title line */}
        <div className="flex justify-between items-center border-b border-gray-150 pb-3">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
            {activePage === 'dashboard' && 'Operations Dashboard'}
            {activePage === 'products' && 'Inventory Directory'}
            {activePage === 'orders' && 'Supermarket Orders'}
            {activePage === 'customers' && 'Customer Base'}
            {activePage === 'reports' && 'Business Intelligence'}
            {activePage === 'analytics' && '30-Day BI Analytics'}
            {activePage === 'settings' && 'Store Variables'}
            {activePage === 'users' && 'System Administrators'}
          </h2>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-3 py-1 rounded border border-emerald-100 uppercase tracking-wider">
            SYSTEM STATUS: LIVE
          </span>
        </div>

        {/* --- PAGE: OVERVIEW DASHBOARD --- */}
        {activePage === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Total Orders</span>
                <h3 className="text-2xl font-black text-gray-800">{orders.length}</h3>
                <p className="text-[10px] text-gray-400 mt-1">All processed & active</p>
              </div>

              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Gross Revenue</span>
                <h3 className="text-2xl font-black text-plum">{formatMoney(totalRevenue)}</h3>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Excludes cancelled</p>
              </div>

              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Stock Items</span>
                <h3 className="text-2xl font-black text-gray-800">{products.length}</h3>
                <p className="text-[10px] text-gray-400 mt-1">Catalog variations</p>
              </div>

              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Low Stock Warnings</span>
                <h3 className={`text-2xl font-black ${lowStockAlerts.length > 0 ? 'text-amber-600' : 'text-gray-800'}`}>{lowStockAlerts.length}</h3>
                <p className="text-[10px] text-gray-400 mt-1">Under trigger limits</p>
              </div>
            </div>

            {/* Sales Chart & Low Stock Side Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm lg:col-span-2">
                <h3 className="font-extrabold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-plum" />
                  <span>Gross Revenue Curve (Last 7 Days)</span>
                </h3>
                <div className="h-[200px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getLast7DaysData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" tickFormatter={(v) => `KES ${v.toLocaleString()}`} />
                      <Tooltip formatter={(value) => [`KES ${Number(value).toLocaleString()}`, 'Sales']} />
                      <Bar dataKey="Sales" fill="var(--plum)" radius={[4, 4, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm flex flex-col">
                <h3 className="font-extrabold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Low Inventory Alerts</span>
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 text-xs">
                  {lowStockAlerts.length > 0 ? (
                    lowStockAlerts.slice(0, 6).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-2.5 bg-amber-50/50 rounded-lg border border-amber-100/50">
                        <span className="font-bold text-gray-700 line-clamp-1 flex-1 pr-3">{p.name}</span>
                        <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.stock === 0 ? 'OUT' : `${p.stock} Left`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-400 font-semibold">
                      All inventory levels optimal.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top 5 Selling vs Lowest Stock Products Chart Widget */}
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
              <h3 className="font-extrabold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-plum" />
                <span>Inventory Performance Monitor: Sales Velocity vs. Stock Warning Levels</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: Top 5 Selling */}
                <div className="space-y-3 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">Top 5 Selling Products (Qty Sold)</h4>
                    <span className="text-[10px] bg-plum/5 text-plum font-extrabold px-2 py-0.5 rounded uppercase">Sales Leaderboard</span>
                  </div>
                  <div className="h-[220px] w-full text-[10px] font-bold">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTop5SellingProducts()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 9 }} tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + '...' : val} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="qty" fill="var(--plum)" name="Qty Sold" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Side: Lowest Stock */}
                <div className="space-y-3 bg-gray-50/40 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">Lowest Stock Products (Qty Left)</h4>
                    <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold px-2 py-0.5 rounded uppercase">Replenish Urgently</span>
                  </div>
                  <div className="h-[220px] w-full text-[10px] font-bold">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getLowestStockProducts()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 9 }} tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + '...' : val} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="stock" fill="#f97316" name="In Stock" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders & Top Selling Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm lg:col-span-2 overflow-hidden">
                <h3 className="font-extrabold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-plum" />
                  <span>Recent Store Purchases</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="pb-3.5">ID</th>
                        <th className="pb-3.5">Customer</th>
                        <th className="pb-3.5">Sum</th>
                        <th className="pb-3.5">Status</th>
                        <th className="pb-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => (
                        <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 font-bold text-gray-800">#{o.id.slice(-6)}</td>
                          <td className="py-3 font-semibold text-gray-600">{o.customer.name}</td>
                          <td className="py-3 font-extrabold text-plum">{formatMoney(o.total)}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${o.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : o.status === 'processing' ? 'bg-blue-50 text-blue-600 border border-blue-100' : o.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400 font-medium">{formatDate(o.date)}</td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400 font-bold">
                            No store orders recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm flex flex-col">
                <h3 className="font-extrabold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Top Retail Items</span>
                </h3>
                <div className="flex-1 space-y-3 max-h-[250px] overflow-y-auto text-xs">
                  {getTopSellingProducts().map(([name, count]) => (
                    <div key={name} className="flex justify-between items-center p-2 border-b border-gray-50">
                      <span className="font-bold text-gray-700 line-clamp-1 flex-1 pr-3">{name}</span>
                      <span className="font-extrabold text-plum bg-plum/5 px-2.5 py-1 rounded-full text-[10px]">
                        {count} Sold
                      </span>
                    </div>
                  ))}
                  {getTopSellingProducts().length === 0 && (
                    <div className="text-center py-10 text-gray-400 font-semibold">
                      No products sold yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- PAGE: PRODUCT INVENTORY --- */}
        {activePage === 'products' && (
          <div className="space-y-4">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {loggedInUser?.role !== 'viewer' ? (
                <button 
                  onClick={() => handleOpenProductModal()}
                  className="w-full sm:w-auto bg-plum hover:bg-plum-dark text-white font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              ) : (
                <div className="text-[11px] text-gray-400 font-extrabold italic bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                  Viewer Mode: Read-Only Catalog
                </div>
              )}

              <div className="w-full sm:max-w-xs relative">
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full py-2 pl-4 pr-10 border border-gray-300 rounded-lg text-xs outline-none focus:border-plum"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Inventory table */}
            <div className="bg-white border border-gray-150 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-4 w-16">Thumbnail</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAdminProducts().map(p => {
                      const isLow = p.stock > 0 && p.stock <= settings.lowStockThreshold;
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="p-4">
                            <img 
                              src={p.image || 'https://via.placeholder.com/44?text=Grocery'} 
                              alt="" 
                              className="w-11 h-11 object-cover rounded-lg border border-gray-100 bg-gray-50"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/44?text=KP';
                              }}
                            />
                          </td>
                          <td className="p-4 font-bold text-gray-800">
                            <span>{p.name}</span>
                            <span className="block text-[10px] text-gray-400 font-medium mt-0.5">{p.brand}</span>
                          </td>
                          <td className="p-4">
                            <span className="bg-plum/5 text-plum font-bold px-2.5 py-1 rounded text-[10px] capitalize">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-4 font-extrabold text-plum">
                            {formatMoney(p.price)}
                            {p.originalPrice > p.price && (
                              <span className="block text-[10px] text-gray-400 line-through font-medium mt-0.5">{formatMoney(p.originalPrice)}</span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-gray-700">{p.stock}</td>
                          <td className="p-4">
                            {p.stock === 0 ? (
                              <span className="bg-red-50 text-red-600 font-bold px-2.5 py-0.5 rounded text-[10px]">Out of Stock</span>
                            ) : isLow ? (
                              <span className="bg-amber-50 text-amber-600 font-bold px-2.5 py-0.5 rounded text-[10px]">Low Stock</span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded text-[10px]">Healthy</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            {loggedInUser?.role !== 'viewer' ? (
                              <>
                                <button 
                                  onClick={() => handleOpenProductModal(p)}
                                  className="text-amber-600 bg-amber-50 hover:bg-amber-100 p-1.5 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-extrabold italic bg-gray-100 px-2.5 py-1 rounded border border-gray-200 select-none uppercase tracking-wide">
                                Read-Only
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {getFilteredAdminProducts().length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                          No matching products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- PAGE: ORDERS RECORDS --- */}
        {activePage === 'orders' && (
          <div className="space-y-4">
            
            {/* Filter actions */}
            <div className="flex gap-2.5 flex-wrap items-center justify-between">
              <div className="flex gap-2.5 flex-wrap items-center">
                {['all', 'pending', 'processing', 'completed', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`px-4 py-1.5 rounded-full border text-xs font-bold capitalize cursor-pointer transition-colors ${orderFilter === st ? 'bg-plum border-plum text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to CSV</span>
              </button>
            </div>

            {/* Orders list */}
            <div className="bg-white border border-gray-150 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-4">ID</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Items Count</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Purchase Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredOrders().map(o => (
                      <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-4 font-bold text-gray-800">#{o.id.slice(-6)}</td>
                        <td className="p-4">
                          <span className="font-bold text-gray-800 block">{o.customer.name}</span>
                          <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">{o.customer.phone}</span>
                        </td>
                        <td className="p-4 font-bold text-gray-700">{o.items.length} items</td>
                        <td className="p-4 font-extrabold text-plum">{formatMoney(o.total)}</td>
                        <td className="p-4 font-bold text-gray-600 uppercase">{o.payment}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${o.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : o.status === 'processing' ? 'bg-blue-50 text-blue-600 border border-blue-100' : o.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 font-medium whitespace-nowrap">{formatDate(o.date)}</td>
                        <td className="p-4 text-right space-x-1 whitespace-nowrap">
                          <button 
                            onClick={() => { setViewingOrder(o); setInternalOrderNotes(o.notes || ''); }}
                            className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors"
                            title="View / Notes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {loggedInUser?.role !== 'viewer' && (
                            <>
                              {o.status === 'pending' && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, 'processing')}
                                  className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors"
                                  title="Process Order"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {o.status === 'processing' && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, 'completed')}
                                  className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors"
                                  title="Mark Completed"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                </button>
                              )}

                              {o.status !== 'cancelled' && o.status !== 'completed' && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}
                                  className="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors"
                                  title="Cancel Order"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {getFilteredOrders().length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                          No orders registered in this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- PAGE: CUSTOMERS REGISTRY --- */}
        {activePage === 'customers' && (
          <div className="bg-white border border-gray-150 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Rank ID</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Phone Contact</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Primary Destination</th>
                    <th className="p-4">Orders Placed</th>
                    <th className="p-4 text-right">Aggregate Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const customersMap: { [key: string]: { name: string; phone: string; email: string; city: string; county: string; orders: number; spent: number } } = {};
                    orders.forEach(o => {
                      const key = o.customer.phone || o.customer.name;
                      if (!customersMap[key]) {
                        customersMap[key] = {
                          name: o.customer.name,
                          phone: o.customer.phone,
                          email: o.customer.email || '—',
                          city: o.customer.city,
                          county: o.customer.county,
                          orders: 0,
                          spent: 0
                        };
                      }
                      customersMap[key].orders++;
                      if (o.status !== 'cancelled') {
                        customersMap[key].spent += o.total;
                      }
                    });

                    const list = Object.values(customersMap).sort((a, b) => b.spent - a.spent);

                    return list.map((c, idx) => (
                      <tr key={c.phone} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-4 font-bold text-gray-400">#{idx + 1}</td>
                        <td className="p-4 font-bold text-gray-800">{c.name}</td>
                        <td className="p-4 font-semibold text-gray-600">{c.phone}</td>
                        <td className="p-4 text-gray-500 font-medium">{c.email}</td>
                        <td className="p-4 font-semibold text-gray-500">{c.city}, {c.county}</td>
                        <td className="p-4 font-bold text-gray-700">{c.orders} orders</td>
                        <td className="p-4 font-extrabold text-plum text-right">{formatMoney(c.spent)}</td>
                      </tr>
                    ));
                  })()}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                        No customer contacts recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- PAGE: BUSINESS ANALYTICS (REPORTS) --- */}
        {activePage === 'reports' && (
          <div className="space-y-6">
            
            {/* Quick stats for Today */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Today's Orders</span>
                <h3 className="text-xl font-black text-gray-800">
                  {orders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).length}
                </h3>
              </div>
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Today's Sales</span>
                <h3 className="text-xl font-black text-plum">
                  {formatMoney(
                    orders
                      .filter(o => new Date(o.date).toDateString() === new Date().toDateString() && o.status !== 'cancelled')
                      .reduce((s, o) => s + o.total, 0)
                  )}
                </h3>
              </div>
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Pending Processing</span>
                <h3 className="text-xl font-black text-amber-600">
                  {orders.filter(o => o.status === 'pending').length}
                </h3>
              </div>
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Completed Deliveries</span>
                <h3 className="text-xl font-black text-emerald-600">
                  {orders.filter(o => o.status === 'completed').length}
                </h3>
              </div>
            </div>

            {/* Progress metrics split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Status report */}
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-gray-800 text-sm border-b border-gray-100 pb-2">
                  Order Status Metrics
                </h3>
                <div className="space-y-3.5">
                  {getOrderStatusPercentages().map(stat => (
                    <div key={stat.status} className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center font-bold text-gray-700 capitalize">
                        <span>{stat.status}</span>
                        <span>{stat.count} ({stat.pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-plum rounded-full transition-all duration-500"
                          style={{ width: `${stat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Sales progress report */}
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-gray-800 text-sm border-b border-gray-100 pb-2">
                  Category Retail Volume (excluding cancelled)
                </h3>
                <div className="space-y-3.5">
                  {(() => {
                    const breakdown = getCategorySalesBreakdown();
                    const maxVal = breakdown[0]?.[1] || 1;
                    return breakdown.map(([cat, total]) => {
                      const pct = Math.round((total / maxVal) * 100);
                      return (
                        <div key={cat} className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center font-bold text-gray-700 capitalize">
                            <span className="truncate max-w-[150px]">{cat}</span>
                            <span className="text-plum font-extrabold">{formatMoney(total)}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {getCategorySalesBreakdown().length === 0 && (
                    <div className="text-center py-10 text-gray-400 font-semibold">
                      No categories records available.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- PAGE: 30-DAY BI ANALYTICS --- */}
        {activePage === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">30-Day Revenue</span>
                <h3 className="text-xl font-black text-plum">
                  {formatMoney(
                    orders
                      .filter(o => {
                        const d = new Date(o.date);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return d >= thirtyDaysAgo && o.status !== 'cancelled';
                      })
                      .reduce((sum, o) => sum + o.total, 0)
                  )}
                </h3>
              </div>
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">30-Day Orders</span>
                <h3 className="text-xl font-black text-gray-800">
                  {
                    orders.filter(o => {
                      const d = new Date(o.date);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return d >= thirtyDaysAgo && o.status !== 'cancelled';
                    }).length
                  }
                </h3>
              </div>
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Avg Order Value</span>
                <h3 className="text-xl font-black text-emerald-600">
                  {(() => {
                    const oList = orders.filter(o => {
                      const d = new Date(o.date);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return d >= thirtyDaysAgo && o.status !== 'cancelled';
                    });
                    const total = oList.reduce((sum, o) => sum + o.total, 0);
                    return formatMoney(oList.length ? total / oList.length : 0);
                  })()}
                </h3>
              </div>
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Items Dispatched</span>
                <h3 className="text-xl font-black text-amber-600">
                  {
                    orders
                      .filter(o => {
                        const d = new Date(o.date);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return d >= thirtyDaysAgo && o.status !== 'cancelled';
                      })
                      .reduce((sum, o) => sum + o.items.reduce((acc, item) => acc + item.qty, 0), 0)
                  }
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Revenue Trend Chart */}
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                  Daily Revenue Trends (Last 30 Days)
                </h4>
                <div className="h-[300px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={get30DaysRevenueData()}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--plum)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--plum)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" tickFormatter={(v) => `Ksh ${v}`} />
                      <Tooltip formatter={(value) => [`Ksh ${Number(value).toLocaleString()}`, 'Daily Revenue']} />
                      <Area type="monotone" dataKey="Revenue" stroke="var(--plum)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top-Selling Products Bar Chart */}
              <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm">
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                  Top-Selling Products by Quantity (Last 30 Days)
                </h4>
                <div className="h-[300px] w-full text-xs">
                  {get30DaysTopSellingProducts().length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold">
                      No order sales records in the last 30 days.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={get30DaysTopSellingProducts()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                        <XAxis type="number" stroke="#9CA3AF" />
                        <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={110} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(value, name) => [value, name === 'qty' ? 'Quantity Sold' : 'Total Revenue']} />
                        <Bar dataKey="qty" fill="#eab308" radius={[0, 4, 4, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE: CONFIGURATION SETTINGS --- */}
        {activePage === 'settings' && (
          loggedInUser?.role !== 'superadmin' ? (
            <div className="bg-white border border-gray-150 rounded-xl p-12 text-center shadow-sm max-w-2xl mx-auto my-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-gray-800">Access Restricted</h3>
              <p className="text-gray-500 text-xs font-semibold mt-2 max-w-md mx-auto leading-relaxed">
                You are currently signed in as <span className="text-plum font-extrabold">"{loggedInUser?.name || 'Staff'}"</span> with the role <span className="text-plum font-extrabold uppercase">{loggedInUser?.role}</span>. Store configurations can only be customized by a Super Administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm max-w-2xl">
            <h3 className="font-extrabold text-gray-800 text-sm border-b border-gray-100 pb-2 mb-6">
              Store Parameters & Shipping Fees
            </h3>
            
            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Store Name</label>
                  <input 
                    type="text" 
                    required 
                    value={setStoreName}
                    onChange={(e) => setSetStoreName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Support Phone</label>
                  <input 
                    type="text" 
                    required 
                    value={setStorePhone}
                    onChange={(e) => setSetStorePhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Store email</label>
                <input 
                  type="email" 
                  required 
                  value={setStoreEmail}
                  onChange={(e) => setSetStoreEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Free Delivery threshold (KES)</label>
                  <input 
                    type="number" 
                    required 
                    min={0}
                    value={setFreeThreshold}
                    onChange={(e) => setSetFreeThreshold(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Base Delivery Fee (KES)</label>
                  <input 
                    type="number" 
                    required 
                    min={0}
                    value={setFee}
                    onChange={(e) => setSetFee(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Low stock trigger (Units)</label>
                  <input 
                    type="number" 
                    required 
                    min={1}
                    value={setLowStock}
                    onChange={(e) => setSetLowStock(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
              </div>

              <div className="bg-plum/5 p-4 rounded-xl border border-plum/15 space-y-2 mt-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={setSeasonalTheme}
                    onChange={(e) => setSetSeasonalTheme(e.target.checked)}
                    className="rounded border-gray-300 text-plum focus:ring-plum w-4.5 h-4.5 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-gray-800 text-xs">Enable Festive Seasonal Themes</span>
                    <span className="block text-[10px] text-gray-500 font-medium">
                      Automatically activate subtle, aesthetic falling particle animations (snowflakes, leaves, or flower petals) matched to the current month of the year.
                    </span>
                  </div>
                </label>
              </div>

              <div className="bg-plum/5 p-4 rounded-xl border border-plum/15 space-y-4 mt-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={setLowStockEmailEnabled}
                    onChange={(e) => setSetLowStockEmailEnabled(e.target.checked)}
                    className="rounded border-gray-350 text-plum focus:ring-plum w-4.5 h-4.5 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-gray-800 text-xs">Enable Low-Stock Email Alerts (Threshold: &lt; 3 Units)</span>
                    <span className="block text-[10px] text-gray-500 font-medium">
                      Enable instant simulated email notification alerts whenever any product stock level falls below 3 units after an order is processed.
                    </span>
                  </div>
                </label>

                {setLowStockEmailEnabled && (
                  <div className="pt-3 border-t border-plum/10">
                    <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Admin Notification Email</label>
                    <input 
                      type="email" 
                      required={setLowStockEmailEnabled}
                      value={setAdminEmailForNotifications}
                      onChange={(e) => setSetAdminEmailForNotifications(e.target.value)}
                      placeholder="e.g. admin@kipchimatt.co.ke"
                      className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum bg-white font-semibold text-gray-750"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">This is where automated low-stock notices will be dispatched.</p>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="bg-plum hover:bg-plum-dark text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors mt-6 text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Store Configurations</span>
              </button>
            </form>
          </div>

          {/* Live Admin Email Notifications Log (Subtle and clean) */}
          <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm max-w-2xl mt-6">
            <h3 className="font-extrabold text-gray-800 text-xs border-b border-gray-100 pb-2 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              <span>Admin Email Notifications Log</span>
            </h3>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed font-semibold">
              History of automated low-stock notice dispatches. Alerts are automatically triggered and simulated to the designated recipient whenever a product stock level drops below 3 units.
            </p>
            
            {adminAlerts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 font-bold text-xs">
                No email alerts dispatched yet. All inventory levels are stable.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {adminAlerts.map(alert => (
                  <div key={alert.id} className="p-3 bg-gray-50 rounded-lg border border-gray-150 flex items-start justify-between gap-4 text-xs font-semibold">
                    <div>
                      <div className="text-gray-800 font-bold">
                        Low Stock Alert: <span className="text-plum font-black">"{alert.productName}"</span>
                      </div>
                      <div className="text-gray-500 text-[10px] mt-0.5">
                        Recipient Email: <span className="text-gray-700 font-extrabold">{alert.sentTo}</span>
                      </div>
                      <div className="text-[9px] text-gray-400 mt-1 font-semibold">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className="bg-red-50 text-red-600 text-[10px] font-black px-2.5 py-0.5 rounded border border-red-100">
                        Current Stock: {alert.stock}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 mt-2 uppercase tracking-wider">
                        <CheckCheck className="w-3.5 h-3.5" /> Dispatched
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
          )
        )}

        {/* --- PAGE: ADMINISTRATOR ACCOUNTS MANAGEMENT --- */}
        {activePage === 'users' && loggedInUser?.role === 'superadmin' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-gray-800 text-sm">
                    System Administrators & Staff Roles
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1 font-semibold">
                    Manage platform operators, role access levels, and secure authentication keys.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenUserModal(null)}
                  className="bg-plum hover:bg-plum-dark text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Operator Account</span>
                </button>
              </div>

              {loadingUsers ? (
                <div className="text-center py-12 text-xs font-semibold text-gray-400 animate-pulse">
                  Loading administrator registry...
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 font-bold text-xs">
                  No operator accounts registered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 pl-2">Operator Name</th>
                        <th className="pb-3">Email Address</th>
                        <th className="pb-3">Access Tier Role</th>
                        <th className="pb-3">Authorized Key</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 pl-2">
                            <div className="font-bold text-gray-800">{u.name}</div>
                            <div className="text-[9px] text-gray-400 mt-0.5">UID: {u.id}</div>
                          </td>
                          <td className="py-3.5 font-medium">{u.email}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                              u.role === 'superadmin' 
                                ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                : u.role === 'editor' 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-gray-100 text-gray-600 border-gray-250'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-gray-400">••••••••</td>
                          <td className="py-3.5 text-right pr-2">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenUserModal(u)}
                                className="p-1.5 text-gray-500 hover:text-plum hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                title="Edit operator configurations"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {u.id !== 'u-1' && u.id !== loggedInUser?.id ? (
                                <button
                                  type="button"
                                  onClick={() => handleUserDelete(u.id)}
                                  className="p-1.5 text-gray-400 hover:text-red hover:bg-red/5 rounded transition-colors cursor-pointer"
                                  title="Revoke operator credentials"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="p-1.5 text-gray-300 cursor-not-allowed select-none" title="Protected System Account">
                                  <ShieldCheck className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Add / Edit Administrator */}
        {userModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 select-none">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
              <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-extrabold text-sm text-plum flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>{editingUser ? 'Configure Operator Settings' : 'Enroll New Administrator'}</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Operator Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Kipchoge Keino"
                    value={userFormName}
                    onChange={(e) => setUserFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum font-semibold text-gray-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Administrative Email Address</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. user@kipchimatt.co.ke"
                    value={userFormEmail}
                    onChange={(e) => setUserFormEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum font-semibold text-gray-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">Access Authorization Tier</label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as AdminRole)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum font-extrabold text-gray-700 bg-white"
                  >
                    <option value="superadmin">Super Admin (Full Access & Administrator Management)</option>
                    <option value="editor">Catalog Editor (Manage products, stocks & orders)</option>
                    <option value="viewer">Read-Only Viewer (Access dashboards & statistics only)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    {editingUser ? 'Reset Access Password (Optional)' : 'Access Key Password'}
                  </label>
                  <input 
                    type="password" 
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to retain current password' : 'Enter access key password'}
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum font-semibold text-gray-700"
                  />
                  {editingUser && (
                    <p className="text-[10px] text-gray-400 mt-1">To preserve current credentials, keep the default indicator intact.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setUserModalOpen(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-750 font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-plum hover:bg-plum-dark text-white font-bold px-5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Account</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: Add / Edit Product */}
      {productModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-extrabold text-base text-plum flex items-center gap-2">
                <Boxes className="w-5 h-5" />
                <span>{editingProduct ? 'Modify Product Listing' : 'Publish New Product'}</span>
              </h3>
              <button 
                onClick={() => setProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 text-xs font-semibold text-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">Product Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g., Pembe Maize Meal 2kg"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">Manufacturer / Brand</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Pembe"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">Catalog Category *</label>
                  <select 
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum bg-white"
                  >
                    <option value="">Select category</option>
                    {categoryMeta.filter(c => c.key !== 'all').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">Stock Level Quantity *</label>
                  <input 
                    type="number" 
                    required 
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">Retail Price (KES) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1}
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">Original Strike Price (KES - For discount deals)</label>
                  <input 
                    type="number" 
                    min={0}
                    placeholder="Leave empty or zero for no discount"
                    value={prodOriginalPrice}
                    onChange={(e) => setProdOriginalPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">Product Description</label>
                <textarea 
                  rows={3}
                  placeholder="Provide a detailed overview of the product, benefits, and usage directions..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">Specifications (One per line as "Label: Value")</label>
                <textarea 
                  rows={3}
                  placeholder="Weight: 2 kg&#10;Brand Origin: Kenya&#10;Shelf Life: 12 Months&#10;Packaging: Sealed Plastic"
                  value={prodSpecifications}
                  onChange={(e) => setProdSpecifications(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-plum font-mono font-medium"
                />
              </div>

              {/* Product photo upload / URL */}
              <div>
                <label className="block text-xs font-bold mb-1.5">Product Display Photo</label>
                <div className="flex gap-4 items-start">
                  <img 
                    src={prodImage || 'https://via.placeholder.com/64?text=Item'} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=KP';
                    }}
                  />
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      placeholder="Paste Image web address (URL)"
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-plum"
                    />
                    <div className="flex items-center gap-2">
                      <label 
                        htmlFor="image-upload" 
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 border border-gray-200 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload local file</span>
                      </label>
                      <input 
                        type="file" 
                        id="image-upload" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="hidden" 
                      />
                      <span className="text-[10px] text-gray-400 font-semibold">Max size 2MB</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-gray-100 pt-5 mt-6">
                <button 
                  type="button" 
                  onClick={() => setProductModalOpen(false)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold px-5 py-2 rounded-lg cursor-pointer border border-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-plum hover:bg-plum-dark text-white font-bold px-5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Modifications' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detailed Order Sheets & Notes */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-extrabold text-base text-plum flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Supermarket Order Sheet #{viewingOrder.id.slice(-6)}</span>
              </h3>
              <button 
                onClick={() => setViewingOrder(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              
              {/* Customer and Shipping cards */}
              <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-2">
                <h4 className="font-extrabold text-plum text-xs">Buyer Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700">
                  <div>
                    <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Full Name</span>
                    <span className="font-extrabold text-sm">{viewingOrder.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Phone Number</span>
                    <span className="font-extrabold text-sm">{viewingOrder.customer.phone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Delivery Location</span>
                    <span className="font-semibold">{viewingOrder.customer.address}, {viewingOrder.customer.city}, {viewingOrder.customer.county}</span>
                  </div>
                  {viewingOrder.customer.email && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Email Contact</span>
                      <span className="font-semibold text-blue-600">{viewingOrder.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order products list */}
              <div className="border border-gray-150 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-600 border-b border-gray-150 flex justify-between items-center">
                  <span>Ordered Items</span>
                  <span className="text-plum font-black">{viewingOrder.items.length} unique</span>
                </div>
                <div className="divide-y divide-gray-100 px-4">
                  {viewingOrder.items.map(item => (
                    <div key={item.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.image || 'https://via.placeholder.com/44?text=KP'} 
                          alt="" 
                          className="w-10 h-10 object-cover rounded border border-gray-100 bg-gray-50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/44?text=KP';
                          }}
                        />
                        <div>
                          <span className="font-bold text-gray-800 text-xs sm:text-sm">{item.name}</span>
                          <span className="block text-[10px] text-gray-400 font-bold mt-0.5">{formatMoney(item.price)} each</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-gray-800 block text-xs">x{item.qty}</span>
                        <span className="font-extrabold text-plum text-xs mt-0.5 block">{formatMoney(item.price * item.qty)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50/50 p-4 border-t border-gray-150 text-xs font-bold space-y-1.5">
                  <div className="flex justify-between text-gray-500">
                    <span>Retail Subtotal</span>
                    <span>{formatMoney(viewingOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee</span>
                    <span>{viewingOrder.deliveryFee > 0 ? formatMoney(viewingOrder.deliveryFee) : 'FREE'}</span>
                  </div>
                  <div className="flex justify-between text-plum font-black text-sm pt-2 border-t border-gray-100">
                    <span>Total Paid</span>
                    <span>{formatMoney(viewingOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Staff Notes section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Internal Operational Notes (Not visible to buyers)</label>
                <textarea 
                  rows={3}
                  disabled={loggedInUser?.role === 'viewer'}
                  placeholder={loggedInUser?.role === 'viewer' ? 'Viewer Mode: Read-only access.' : 'e.g., Rider Kamau dispatched at 2 PM, M-Pesa transaction confirmed...'}
                  value={internalOrderNotes}
                  onChange={(e) => setInternalOrderNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-plum font-semibold text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div className="flex justify-between gap-2 border-t border-gray-100 pt-4 mt-6 flex-wrap">
                <button 
                  type="button" 
                  onClick={() => handlePrintReceipt(viewingOrder)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2.5 rounded-lg cursor-pointer flex items-center gap-1.5 border border-gray-200"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Retail Receipt</span>
                </button>
                
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setViewingOrder(null)}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer border border-gray-200"
                  >
                    Close Sheet
                  </button>
                  {loggedInUser?.role !== 'viewer' && (
                    <button 
                      type="button" 
                      onClick={handleSaveOrderNotes}
                      className="bg-plum hover:bg-plum-dark text-white font-bold px-5 py-2.5 rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Internal Note</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
