import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Seed default datasets from source code
import { defaultProducts, defaultSettings } from "./src/data/catalog";
import { Product, Order, StoreSettings, AdminUser } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payloads including large Base64-encoded product thumbnails
  app.use(express.json({ limit: "20mb" }));

  // Establish stable local file persistence directory
  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
  const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
  const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
  const ALERTS_FILE = path.join(DATA_DIR, "admin-alerts.json");
  const ADMIN_USERS_FILE = path.join(DATA_DIR, "admin-users.json");

  // Helper read/write utility
  function readData<T>(filePath: string, defaultVal: T): T {
    try {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), "utf-8");
        return defaultVal;
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err);
      return defaultVal;
    }
  }

  function writeData<T>(filePath: string, val: T) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(val, null, 2), "utf-8");
    } catch (err) {
      console.error(`Error writing file ${filePath}:`, err);
    }
  }

  const defaultAdminUsers: AdminUser[] = [
    {
      id: "u-1",
      name: "Super Administrator",
      email: "superadmin@kipchimatt.co.ke",
      password: "superadmin123",
      role: "superadmin",
      createdAt: new Date().toISOString()
    },
    {
      id: "u-2",
      name: "Catalog Editor",
      email: "editor@kipchimatt.co.ke",
      password: "editor123",
      role: "editor",
      createdAt: new Date().toISOString()
    },
    {
      id: "u-3",
      name: "Auditor",
      email: "viewer@kipchimatt.co.ke",
      password: "viewer123",
      role: "viewer",
      createdAt: new Date().toISOString()
    }
  ];

  // Load and seed states dynamically
  let products: Product[] = readData(PRODUCTS_FILE, defaultProducts);
  let orders: Order[] = readData(ORDERS_FILE, []);
  let settings: StoreSettings = readData(SETTINGS_FILE, defaultSettings);
  let adminAlerts: any[] = readData(ALERTS_FILE, []);
  let adminUsers: AdminUser[] = readData(ADMIN_USERS_FILE, defaultAdminUsers);

  // --- API ROUTE ENDPOINTS ---

  // GET ALL PRODUCTS
  app.get("/api/products", (req, res) => {
    res.json(products);
  });

  // BULK UPDATE PRODUCTS
  app.post("/api/products/bulk", (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        products = req.body;
        writeData(PRODUCTS_FILE, products);
        res.json({ success: true, count: products.length });
      } else {
        res.status(400).json({ error: "Payload must be an array of products" });
      }
    } catch (e) {
      console.error("Failed to bulk update products:", e);
      res.status(500).json({ error: "Failed to bulk update products" });
    }
  });

  // ADD NEW PRODUCT
  app.post("/api/products", (req, res) => {
    try {
      const payload = req.body;
      const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
      const newProduct: Product = {
        id: maxId + 1,
        name: payload.name || "",
        brand: payload.brand || "Kipchimatt",
        category: payload.category || "food cupboard",
        price: Number(payload.price) || 0,
        originalPrice: Number(payload.originalPrice) || 0,
        stock: Number(payload.stock) || 0,
        image: payload.image || "",
        description: payload.description || "",
        specifications: payload.specifications || {},
        rating: payload.rating || 5,
        ratingCount: payload.ratingCount || 0,
        reviews: payload.reviews || []
      };
      products.push(newProduct);
      writeData(PRODUCTS_FILE, products);
      res.json(newProduct);
    } catch (e) {
      console.error("Failed to add product:", e);
      res.status(500).json({ error: "Failed to add product" });
    }
  });

  // UPDATE PRODUCT (e.g. edits, review posts, stock refills)
  app.put("/api/products/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Product not found" });
      }
      products[idx] = {
        ...products[idx],
        ...req.body,
        id // Keep original ID safe
      };
      writeData(PRODUCTS_FILE, products);
      res.json(products[idx]);
    } catch (e) {
      console.error("Failed to update product:", e);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // DELETE PRODUCT
  app.delete("/api/products/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      products = products.filter(p => p.id !== id);
      writeData(PRODUCTS_FILE, products);
      res.json({ success: true });
    } catch (e) {
      console.error("Failed to delete product:", e);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // GET ALL ORDERS
  app.get("/api/orders", (req, res) => {
    res.json(orders);
  });

  // BULK UPDATE ORDERS
  app.post("/api/orders/bulk", (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        orders = req.body;
        writeData(ORDERS_FILE, orders);
        res.json({ success: true, count: orders.length });
      } else {
        res.status(400).json({ error: "Payload must be an array of orders" });
      }
    } catch (e) {
      console.error("Failed to bulk update orders:", e);
      res.status(500).json({ error: "Failed to bulk update orders" });
    }
  });

  // PLACE NEW ORDER (performs client-side item inventory deduction on server)
  app.post("/api/orders", (req, res) => {
    try {
      const payload = req.body;
      const newOrder: Order = {
        id: payload.id,
        items: payload.items || [],
        customer: payload.customer,
        payment: payload.payment,
        subtotal: Number(payload.subtotal) || 0,
        deliveryFee: Number(payload.deliveryFee) || 0,
        total: Number(payload.total) || 0,
        status: payload.status || "pending",
        notes: payload.notes || "",
        date: payload.date || new Date().toISOString()
      };

      // Deduct inventory levels on server to guarantee stock sync
      newOrder.items.forEach(item => {
        const pIdx = products.findIndex(p => p.id === item.id);
        if (pIdx !== -1) {
          products[pIdx].stock = Math.max(0, products[pIdx].stock - item.qty);
        }
      });
      writeData(PRODUCTS_FILE, products);

      orders.unshift(newOrder);
      writeData(ORDERS_FILE, orders);
      res.json(newOrder);
    } catch (e) {
      console.error("Failed to process order:", e);
      res.status(500).json({ error: "Failed to process order" });
    }
  });

  // UPDATE ORDER (status adjustments or administrative staff logs)
  app.put("/api/orders/:id", (req, res) => {
    try {
      const id = req.params.id;
      const idx = orders.findIndex(o => o.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Order not found" });
      }
      orders[idx] = {
        ...orders[idx],
        ...req.body
      };
      writeData(ORDERS_FILE, orders);
      res.json(orders[idx]);
    } catch (e) {
      console.error("Failed to update order:", e);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // GET STORE CONFIGURATION SETTINGS
  app.get("/api/settings", (req, res) => {
    res.json(settings);
  });

  // SAVE STORE CONFIGURATION SETTINGS
  app.post("/api/settings", (req, res) => {
    try {
      settings = {
        ...settings,
        ...req.body
      };
      writeData(SETTINGS_FILE, settings);
      res.json(settings);
    } catch (e) {
      console.error("Failed to save settings:", e);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // GET LOW STOCK ALERTS
  app.get("/api/admin-alerts", (req, res) => {
    res.json(adminAlerts);
  });

  // BULK UPDATE ADMIN ALERTS
  app.post("/api/admin-alerts/bulk", (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        adminAlerts = req.body;
        writeData(ALERTS_FILE, adminAlerts);
        res.json({ success: true, count: adminAlerts.length });
      } else {
        res.status(400).json({ error: "Payload must be an array of alerts" });
      }
    } catch (e) {
      console.error("Failed to bulk update alerts:", e);
      res.status(500).json({ error: "Failed to bulk update alerts" });
    }
  });

  // RECORD NEW LOW STOCK ALERT
  app.post("/api/admin-alerts", (req, res) => {
    try {
      const newAlert = req.body;
      adminAlerts.unshift(newAlert);
      writeData(ALERTS_FILE, adminAlerts);
      res.json(newAlert);
    } catch (e) {
      console.error("Failed to log low stock alert:", e);
      res.status(500).json({ error: "Failed to log alert" });
    }
  });

  // --- ADMIN USERS & SESSIONS API ENDPOINTS ---

  // ADMIN LOGIN (by Email)
  app.post("/api/admin/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = adminUsers.find(
        u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
      );
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Return user without password
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      console.error("Admin login error:", e);
      res.status(500).json({ error: "Internal server error during login" });
    }
  });

  // GET ALL ADMIN USERS
  app.get("/api/admin/users", (req, res) => {
    try {
      // Return users (with passwords hidden/masked or safe)
      const safeUsers = adminUsers.map(({ password, ...rest }) => ({
        ...rest,
        password: password ? "••••••••" : undefined
      }));
      res.json(safeUsers);
    } catch (e) {
      console.error("Failed to fetch admin users:", e);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  // CREATE ADMIN USER
  app.post("/api/admin/users", (req, res) => {
    try {
      const payload = req.body;
      if (!payload.email || !payload.password || !payload.name || !payload.role) {
        return res.status(400).json({ error: "Missing required admin user fields" });
      }

      // Check if email already exists
      const exists = adminUsers.some(u => u.email.toLowerCase() === payload.email.toLowerCase().trim());
      if (exists) {
        return res.status(400).json({ error: "An administrator with this email already exists" });
      }

      const newUser: AdminUser = {
        id: "u-" + Math.random().toString(36).substr(2, 9),
        name: payload.name.trim(),
        email: payload.email.toLowerCase().trim(),
        password: payload.password,
        role: payload.role,
        createdAt: new Date().toISOString()
      };

      adminUsers.push(newUser);
      writeData(ADMIN_USERS_FILE, adminUsers);

      const { password: _, ...safeUser } = newUser;
      res.json(safeUser);
    } catch (e) {
      console.error("Failed to create admin user:", e);
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // UPDATE ADMIN USER
  app.put("/api/admin/users/:id", (req, res) => {
    try {
      const id = req.params.id;
      const idx = adminUsers.findIndex(u => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Admin user not found" });
      }

      const payload = req.body;
      if (payload.email) {
        const otherExists = adminUsers.some(
          u => u.id !== id && u.email.toLowerCase() === payload.email.toLowerCase().trim()
        );
        if (otherExists) {
          return res.status(400).json({ error: "An administrator with this email already exists" });
        }
        adminUsers[idx].email = payload.email.toLowerCase().trim();
      }

      if (payload.name) adminUsers[idx].name = payload.name.trim();
      if (payload.role) adminUsers[idx].role = payload.role;
      if (payload.password && payload.password !== "••••••••") {
        adminUsers[idx].password = payload.password;
      }

      writeData(ADMIN_USERS_FILE, adminUsers);

      const { password: _, ...safeUser } = adminUsers[idx];
      res.json(safeUser);
    } catch (e) {
      console.error("Failed to update admin user:", e);
      res.status(500).json({ error: "Failed to update admin user" });
    }
  });

  // DELETE ADMIN USER
  app.delete("/api/admin/users/:id", (req, res) => {
    try {
      const id = req.params.id;
      if (id === "u-1") {
        return res.status(400).json({ error: "Cannot delete the primary system superadmin" });
      }

      adminUsers = adminUsers.filter(u => u.id !== id);
      writeData(ADMIN_USERS_FILE, adminUsers);
      res.json({ success: true });
    } catch (e) {
      console.error("Failed to delete admin user:", e);
      res.status(500).json({ error: "Failed to delete admin user" });
    }
  });

  // --- VITE DEV MIDDLEWARE AND STATIC PRODUCTION LAYER ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server listening on port ${PORT}`);
  });
}

startServer();
