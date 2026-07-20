import React, { useState, useEffect } from 'react';
import { 
  Phone, Mail, MapPin, Heart, ShoppingBag, Send, CreditCard, Laptop,
  ArrowUp, Globe, Eye, Settings, Wifi, WifiOff, AlertTriangle, Sparkles, X, Check, EyeOff
} from 'lucide-react';
import { Product, Order, StoreSettings, CartItem, Customer } from './types';
import { 
  defaultProducts, defaultSettings, formatMoney, uid 
} from './data/catalog';

// Components
import Header from './components/Header';
import Hero from './components/Hero';
import Storefront from './components/Storefront';
import AdminPortal from './components/AdminPortal';
import CartSidebar from './components/CartSidebar';
import WishlistSidebar from './components/WishlistSidebar';
import CheckoutModal from './components/CheckoutModal';
import CartPage from './components/CartPage';
import AgeGateModal from './components/AgeGateModal';
import ProductDetailModal from './components/ProductDetailModal';
import UserProfileModal from './components/UserProfileModal';
import CompareModal from './components/CompareModal';
import SeasonalParticles from './components/SeasonalParticles';

interface ToastMsg {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // --- Persistent States from LocalStorage ---
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('kipchimatt_products');
    return saved ? JSON.parse(saved) : defaultProducts;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('kipchimatt_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('kipchimatt_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('kipchimatt_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<number[]>(() => {
    const saved = localStorage.getItem('kipchimatt_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Session & Router States ---
  const [currentView, setCurrentView] = useState<'shop' | 'admin' | 'cart'>('shop');
  const [deliveryLocation, setDeliveryLocation] = useState<string>(() => {
    return localStorage.getItem('kipchimatt_delivery_county') || 'Nairobi';
  });
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('kipchimatt_admin') === '1';
  });

  // --- Drawers & Modals Toggles ---
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  // --- Newsletter State ---
  const [newsletterEmail, setNewsletterEmail] = useState('');

  // --- Global Theme & Compare States ---
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('kipchimatt_dark_mode') === 'true';
  });

  const [comparedProducts, setComparedProducts] = useState<Product[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);

  // --- New Connectivity & Accessibility States ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineStatusMsg, setShowOnlineStatusMsg] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState(1); // 1 = 100%, 1.15 = 115%, 1.3 = 130%
  const [highContrast, setHighContrast] = useState(true);
  const [monochrome, setMonochrome] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // --- Low Stock Urgent Popup State ---
  const [urgentStockProduct, setUrgentStockProduct] = useState<Product | null>(null);
  const [urgentTimer, setUrgentTimer] = useState(300); // 5 mins countdown

  // --- Connectivity and Scroll Listeners ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineStatusMsg(true);
      setTimeout(() => setShowOnlineStatusMsg(false), 5000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineStatusMsg(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // --- Google Translate Loader ---
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .goog-te-gadget-simple {
        background-color: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        padding: 4px 10px !important;
        border-radius: 9999px !important;
        color: white !important;
        font-family: inherit !important;
        font-size: 11px !important;
        display: inline-flex !important;
        align-items: center !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
      }
      .goog-te-gadget-simple:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.4) !important;
      }
      .goog-te-gadget-simple img {
        display: none !important;
      }
      .goog-te-gadget-icon {
        display: none !important;
      }
      .goog-te-menu-value {
        color: white !important;
        font-weight: 700 !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
      }
      .goog-te-menu-value span {
        color: white !important;
      }
      .goog-te-menu-value span:nth-child(3) {
        border-left: 4px solid transparent !important;
        border-right: 4px solid transparent !important;
        border-top: 4px solid white !important;
        margin-left: 4px !important;
      }
      .goog-te-banner-frame.skiptranslate, .goog-te-banner-frame {
        display: none !important;
      }
      body {
        top: 0px !important;
      }
    `;
    document.head.appendChild(styleEl);

    (window as any).googleTranslateElementInit = () => {
      try {
        if ((window as any).google && (window as any).google.translate) {
          new (window as any).google.translate.TranslateElement({
            pageLanguage: 'en',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
        }
      } catch (err) {
        console.warn('Google translate element initialization failed, swallowed safely:', err);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = (err) => {
      console.warn('Google Translate script failed to load, swallowed safely:', err);
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.head.removeChild(styleEl);
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  // --- Accessibility Styles Reactivity ---
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizeScale * 100}%`;
  }, [fontSizeScale]);

  useEffect(() => {
    if (monochrome) {
      document.body.classList.add('accessibility-monochrome');
    } else {
      document.body.classList.remove('accessibility-monochrome');
    }
  }, [monochrome]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // --- Low Stock Urgent Notification Timer ---
  useEffect(() => {
    if (!urgentStockProduct) return;
    setUrgentTimer(300);
    const interval = setInterval(() => {
      setUrgentTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [urgentStockProduct]);

  const formatUrgentTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kipchimatt_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kipchimatt_dark_mode', 'false');
    }
  }, [isDark]);

  const handleToggleCompare = (product: Product) => {
    setComparedProducts(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        showToast(`Removed "${product.name}" from comparison`, 'info');
        return prev.filter(p => p.id !== product.id);
      } else {
        if (prev.length >= 3) {
          showToast('You can compare a maximum of 3 products at a time.', 'error');
          return prev;
        }
        showToast(`Added "${product.name}" to comparison specs list`, 'success');
        return [...prev, product];
      }
    });
  };

  // --- Current Customer (for Loyalty points) ---
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('kipchimatt_current_customer');
    return saved ? JSON.parse(saved) : null;
  });

  // --- Admin Low Stock Alerts Log ---
  const [adminAlerts, setAdminAlerts] = useState<Array<{
    id: string;
    productName: string;
    stock: number;
    timestamp: string;
    sentTo: string;
  }>>(() => {
    const saved = localStorage.getItem('kipchimatt_admin_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // Load initial datasets from our separate Express API backend on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [pRes, oRes, sRes, aRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/orders'),
          fetch('/api/settings'),
          fetch('/api/admin-alerts')
        ]);
        
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData && pData.length > 0) setProducts(pData);
        }
        if (oRes.ok) {
          const oData = await oRes.json();
          setOrders(oData);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          setSettings(sData);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          setAdminAlerts(aData);
        }
      } catch (err) {
        console.error("Error loading backend data:", err);
      } finally {
        setIsInitialLoaded(true);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    localStorage.setItem('kipchimatt_admin_alerts', JSON.stringify(adminAlerts));
    if (isInitialLoaded) {
      fetch('/api/admin-alerts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminAlerts)
      }).catch(err => console.error("Failed to sync admin alerts to backend:", err));
    }
  }, [adminAlerts, isInitialLoaded]);

  const handleTriggerLowStockEmail = (productName: string, stock: number) => {
    const emailTo = settings.adminEmailForNotifications || settings.storeEmail || 'admin@kipchimatt.co.ke';
    const newAlert = {
      id: uid(),
      productName,
      stock,
      timestamp: new Date().toISOString(),
      sentTo: emailTo
    };
    setAdminAlerts(prev => [newAlert, ...prev]);
    showToast(`[Admin Email Alert] Low stock notice sent for "${productName}" (Stock: ${stock})`, 'info');
  };

  // --- Toasts Notifications Stack ---
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const showToast = (msg: string, type: ToastMsg['type'] = 'success') => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- Side Effects Sync to LocalStorage & Backend ---
  useEffect(() => {
    localStorage.setItem('kipchimatt_products', JSON.stringify(products));
    if (isInitialLoaded) {
      fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products)
      }).catch(err => console.error("Failed to sync products to backend:", err));
    }
  }, [products, isInitialLoaded]);

  useEffect(() => {
    localStorage.setItem('kipchimatt_orders', JSON.stringify(orders));
    if (isInitialLoaded) {
      fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orders)
      }).catch(err => console.error("Failed to sync orders to backend:", err));
    }
  }, [orders, isInitialLoaded]);

  useEffect(() => {
    localStorage.setItem('kipchimatt_settings', JSON.stringify(settings));
    if (isInitialLoaded) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).catch(err => console.error("Failed to sync settings to backend:", err));
    }
  }, [settings, isInitialLoaded]);

  useEffect(() => {
    localStorage.setItem('kipchimatt_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('kipchimatt_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (currentCustomer) {
      localStorage.setItem('kipchimatt_current_customer', JSON.stringify(currentCustomer));
    } else {
      localStorage.removeItem('kipchimatt_current_customer');
    }
  }, [currentCustomer]);

  // Synchronize initial delivery location county selection
  const handleDeliveryLocationChange = (county: string) => {
    setDeliveryLocation(county);
    localStorage.setItem('kipchimatt_delivery_county', county);
    showToast(`Delivered County changed to ${county}`, 'info');
  };

  // --- Shopping Functions ---
  const handleCategorySelect = (catKey: string) => {
    setActiveSearch(''); // Clear search when selecting categories
    
    // Check Age Gate for liquor
    if (catKey === 'liquor' && sessionStorage.getItem('kipchimatt_age_ok') !== '1') {
      setPendingCategory('liquor');
      setAgeGateOpen(true);
    } else {
      setActiveCategory(catKey);
      // Smooth scroll back to deals shelf if home filters are changed
      const shelf = document.getElementById('deals-shelf');
      if (shelf) {
        shelf.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleAgeConfirm = (isAdult: boolean) => {
    setAgeGateOpen(false);
    if (isAdult) {
      sessionStorage.setItem('kipchimatt_age_ok', '1');
      if (pendingCategory) {
        setActiveCategory(pendingCategory);
      }
    } else {
      showToast('You must be 18+ to shop liquor & spirits.', 'error');
    }
    setPendingCategory(null);
  };

  const handleBrandSelect = (brandName: string) => {
    setActiveSearch(brandName);
    setActiveCategory('all');
  };

  const handleToggleWishlist = (id: number) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    if (wishlist.includes(id)) {
      setWishlist(prev => prev.filter(wId => wId !== id));
      showToast(`"${prod.name}" removed from Wishlist.`, 'info');
    } else {
      setWishlist(prev => [...prev, id]);
      showToast(`"${prod.name}" saved to Wishlist.`, 'success');
    }
  };

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      showToast('Sorry, this product is out of stock.', 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const nextQty = existing.qty + quantity;
        if (nextQty <= product.stock) {
          showToast(`Added ${quantity} of "${product.name}" to Basket.`, 'success');
          
          if (product.stock < 5) {
            setUrgentStockProduct(product);
          }

          return prev.map(item => item.id === product.id ? { ...item, qty: nextQty } : item);
        } else {
          showToast(`Max stock reached (${product.stock} items).`, 'error');
          return prev;
        }
      } else {
        showToast(`Added ${quantity} of "${product.name}" to Basket.`, 'success');
        
        if (product.stock < 5) {
          setUrgentStockProduct(product);
        }

        return [...prev, {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty: quantity
        }];
      }
    });
  };

  const handleAddReview = (productId: number, review: { userName: string; rating: number; comment: string }) => {
    setProducts(prev => {
      return prev.map(p => {
        if (p.id === productId) {
          const currentReviews = p.reviews || [];
          const newReviewObj = {
            id: uid(),
            userName: review.userName,
            rating: review.rating,
            comment: review.comment,
            date: new Date().toISOString()
          };
          const updatedReviews = [...currentReviews, newReviewObj];
          
          // Recalculate average rating
          const totalStars = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
          const avg = Number((totalStars / updatedReviews.length).toFixed(1));

          const updatedProd = {
            ...p,
            reviews: updatedReviews,
            rating: avg,
            ratingCount: updatedReviews.length
          };

          // Keep selectedProduct state synced in real-time if it's currently open
          if (selectedProduct && selectedProduct.id === productId) {
            setSelectedProduct(updatedProd);
          }

          return updatedProd;
        }
        return p;
      });
    });
  };

  const handleQtyChange = (id: number, delta: number) => {
    const productObj = products.find(p => p.id === id);
    if (!productObj) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;

      const nextQty = existing.qty + delta;
      if (nextQty <= 0) {
        showToast(`Removed "${existing.name}" from Basket.`, 'info');
        return prev.filter(item => item.id !== id);
      }

      if (nextQty > productObj.stock) {
        showToast(`Capped at available inventory (${productObj.stock} items).`, 'error');
        return prev;
      }

      return prev.map(item => item.id === id ? { ...item, qty: nextQty } : item);
    });
  };

  const handleRemoveCartItem = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
    showToast('Product removed from shopping basket.', 'info');
  };

  const handlePlaceOrder = (customerData: Customer, paymentMethod: string, notes?: string): Order | null => {
    // Inventory double-check
    for (const item of cart) {
      const prod = products.find(p => p.id === item.id);
      if (!prod || prod.stock < item.qty) {
        showToast(`Sorry, "${item.name}" stock recently changed. Please adjust quantity.`, 'error');
        return null;
      }
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const deliveryFee = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;

    // --- Loyalty Points System Calculation ---
    const pointsEarned = Math.floor(subtotal / 100);
    const phoneKey = customerData.phone.trim().toLowerCase();
    
    const customersJson = localStorage.getItem('kipchimatt_customers');
    const customers: Record<string, Customer> = customersJson ? JSON.parse(customersJson) : {};
    const existingCustomer = customers[phoneKey];
    
    const prevPoints = existingCustomer?.points || 0;
    const updatedPoints = prevPoints + pointsEarned;
    
    const updatedCustomer: Customer = {
      ...customerData,
      points: updatedPoints
    };
    
    // Save customer back to persistent customer records
    customers[phoneKey] = updatedCustomer;
    localStorage.setItem('kipchimatt_customers', JSON.stringify(customers));
    
    // Update active shopping customer state
    setCurrentCustomer(updatedCustomer);

    const newOrder: Order = {
      id: uid(),
      items: [...cart],
      customer: updatedCustomer,
      payment: paymentMethod,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      status: 'pending',
      notes: notes || '',
      date: new Date().toISOString()
    };

    // Commit order
    setOrders(prev => [newOrder, ...prev]);

    // Deduct inventory levels
    setProducts(prev => {
      return prev.map(p => {
        const cartMatch = cart.find(c => c.id === p.id);
        if (cartMatch) {
          const nextStock = Math.max(0, p.stock - cartMatch.qty);
          if (settings.lowStockEmailEnabled && nextStock < 3 && p.stock >= 3) {
            handleTriggerLowStockEmail(p.name, nextStock);
          }
          return { ...p, stock: nextStock };
        }
        return p;
      });
    });

    // Clear cart (keep checkout modal open so success state is displayed)
    setCart([]);
    showToast(`Order #${newOrder.id.slice(-6).toUpperCase()} placed successfully!`, 'success');
    
    return newOrder;
  };

  const handleLoginCustomer = (phone: string) => {
    const phoneKey = phone.trim().toLowerCase();
    
    // Check persistent customers records
    const customersJson = localStorage.getItem('kipchimatt_customers');
    const customers: Record<string, Customer> = customersJson ? JSON.parse(customersJson) : {};
    const existingCustomer = customers[phoneKey];

    if (existingCustomer) {
      setCurrentCustomer(existingCustomer);
      showToast(`Welcome back, ${existingCustomer.name}!`, 'success');
    } else {
      const matchedOrder = orders.find(o => o.customer.phone.trim().toLowerCase() === phoneKey);
      if (matchedOrder) {
        setCurrentCustomer(matchedOrder.customer);
        showToast(`Welcome back, ${matchedOrder.customer.name}!`, 'success');
      } else {
        const newCust: Customer = {
          name: 'Valued Customer',
          phone: phone,
          email: '',
          address: '',
          city: '',
          county: deliveryLocation,
          points: 0
        };
        setCurrentCustomer(newCust);
        showToast(`New profile created for ${phone}! Earn loyalty points on purchases.`, 'success');
      }
    }
  };

  const handleLogoutCustomer = () => {
    setCurrentCustomer(null);
    showToast('Signed out of your customer profile.', 'info');
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    showToast(`Success! Subscribed "${newsletterEmail.trim()}" for weekly deals.`, 'success');
    setNewsletterEmail('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col antialiased">
      
      {/* Dynamic Connectivity Offline Alert Bar / State Recovery Banner */}
      {showOnlineStatusMsg && (
        <div className={`text-white text-xs font-bold py-2.5 px-4 text-center z-[9999] flex items-center justify-center gap-2 shadow-inner transition-colors ${isOnline ? 'bg-green' : 'bg-orange animate-pulse'}`}>
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-white" />
              <span>Connection Restored! Welcome back. Your cart is safe and fully synchronized.</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-white" />
              <span>You are currently offline. Don't worry, your basket is cached locally so you won't lose your progress!</span>
            </>
          )}
          <button 
            onClick={() => setShowOnlineStatusMsg(false)}
            className="ml-3 hover:opacity-80 transition-opacity bg-white/20 p-1 rounded-full cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Universal Sticky Header */}
      <Header 
        settings={settings}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setActiveCategory('all');
          setActiveSearch('');
        }}
        onSearch={setActiveSearch}
        onCategorySelect={handleCategorySelect}
        onToggleCart={() => {
          setCurrentView(currentView === 'cart' ? 'shop' : 'cart');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleWishlist={() => setWishlistOpen(prev => !prev)}
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        wishlistCount={wishlist.length}
        deliveryLocation={deliveryLocation}
        onDeliveryLocationChange={handleDeliveryLocationChange}
        isLoggedIn={isLoggedIn}
        onLogout={() => {
          setIsLoggedIn(false);
          sessionStorage.removeItem('kipchimatt_admin');
          setCurrentView('shop');
          showToast('Administrative session signed out.', 'info');
        }}
        isDark={isDark}
        onToggleTheme={() => setIsDark(prev => !prev)}
        onToggleUserProfile={() => setUserProfileOpen(prev => !prev)}
      />

      {/* --- View Switcher --- */}
      {currentView === 'shop' ? (
        /* Storefront Application Flow */
        <div className="flex-1 flex flex-col">
          
          {/* Main Hero Marketing Slideshow (only shown on the store home screen) */}
          {!activeCategory || activeCategory === 'all' && !activeSearch && (
            <Hero 
              onExploreCategory={handleCategorySelect}
              onScrollToDeals={() => {
                const shelf = document.getElementById('deals-shelf');
                if (shelf) shelf.scrollIntoView({ behavior: 'smooth' });
              }}
              onScrollToBrands={() => {
                const section = document.getElementById('brands-section');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          )}

          {/* Interactive Products Directory */}
          <Storefront 
            products={products}
            settings={settings}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onCategorySelect={handleCategorySelect}
            onBrandSelect={handleBrandSelect}
            onProductClick={setSelectedProduct}
            activeCategory={activeCategory}
            activeSearch={activeSearch}
            comparedProductIds={comparedProducts.map(p => p.id)}
            onToggleCompare={handleToggleCompare}
            orders={orders}
            currentCustomer={currentCustomer}
            cart={cart}
          />

          {/* Beautiful Supermarket Shopper Footer */}
          <footer className="bg-plum text-white/85 pt-14 pb-8 mt-auto border-t border-plum-dark/60 shadow-inner">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Newsletter Banner */}
              <div className="bg-plum-dark/40 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                <div className="max-w-md">
                  <h4 className="font-extrabold text-white text-base md:text-lg mb-1.5 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-pink-200" />
                    <span>Never Miss a Kikapu Deal</span>
                  </h4>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Subscribe to our weekly circulars to receive special discounts, hot new arrivals, and coupon prompts straight to your inbox.
                  </p>
                </div>
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2 w-full md:max-w-md">
                  <input 
                    type="email" 
                    required
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-full border border-white/20 bg-white/10 text-white placeholder-white/50 text-xs focus:ring-2 focus:ring-white/40 outline-none"
                  />
                  <button 
                    type="submit"
                    className="bg-white hover:bg-white/90 text-plum font-black text-xs px-6 py-3 rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-md whitespace-nowrap"
                  >
                    <span>Subscribe</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Information grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                
                {/* Column 1: Store Intro */}
                <div className="space-y-4">
                  <h4 className="font-black text-white text-sm tracking-wide uppercase">
                    {settings.storeName}
                  </h4>
                  <p className="text-xs leading-relaxed text-white/75">
                    Your most trusted online grocery catalog and household essentials supermarket across Kenya. Delivering fresh food and appliances directly to your home in under 90 minutes.
                  </p>
                  <div className="space-y-2 text-xs font-semibold">
                    <span className="flex items-center gap-2 text-white/90"><Phone className="w-4 h-4 text-pink-200" /><span>{settings.storePhone}</span></span>
                    <span className="flex items-center gap-2 text-white/90"><Mail className="w-4 h-4 text-pink-200" /><span>{settings.storeEmail}</span></span>
                    <span className="flex items-center gap-2 text-white/90"><MapPin className="w-4 h-4 text-pink-200" /><span>Nairobi, Kenya</span></span>
                  </div>
                </div>

                {/* Column 2: Quick Shop Categories */}
                <div className="space-y-4">
                  <h4 className="font-black text-white text-sm tracking-wide uppercase">
                    Shop Categories
                  </h4>
                  <div className="flex flex-col gap-2.5 text-xs font-semibold text-white/80">
                    <button onClick={() => handleCategorySelect('food cupboard')} className="w-fit hover:text-white transition-colors text-left cursor-pointer">Food Cupboard</button>
                    <button onClick={() => handleCategorySelect('fresh food')} className="w-fit hover:text-white transition-colors text-left cursor-pointer">Fresh Food & Dairy</button>
                    <button onClick={() => handleCategorySelect('beverages')} className="w-fit hover:text-white transition-colors text-left cursor-pointer">Beverages</button>
                    <button onClick={() => handleCategorySelect('baby & kids')} className="w-fit hover:text-white transition-colors text-left cursor-pointer">Baby & Kids Care</button>
                    <button onClick={() => handleCategorySelect('electronics')} className="w-fit hover:text-white transition-colors text-left cursor-pointer">Home Electronics</button>
                    <button onClick={() => handleCategorySelect('beauty')} className="w-fit hover:text-white transition-colors text-left cursor-pointer">Beauty & Cosmetics</button>
                  </div>
                </div>

                {/* Column 3: Customer Service */}
                <div className="space-y-4">
                  <h4 className="font-black text-white text-sm tracking-wide uppercase">
                    Customer Care
                  </h4>
                  <div className="flex flex-col gap-2.5 text-xs font-semibold text-white/80">
                    <a href="#" className="hover:text-white transition-colors">Help Center & FAQs</a>
                    <a href="#" className="hover:text-white transition-colors">Rider Delivery Information</a>
                    <a href="#" className="hover:text-white transition-colors">7-Day Refund Policy</a>
                    <a href="#" className="hover:text-white transition-colors">Track Active Shipment</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-white transition-colors">Contact Support Desk</a>
                  </div>
                </div>

                {/* Column 4: Operational links */}
                <div className="space-y-4">
                  <h4 className="font-black text-white text-sm tracking-wide uppercase">
                    Supermarket Links
                  </h4>
                  <div className="flex flex-col gap-2.5 text-xs font-semibold text-white/80">
                    <a href="#" className="hover:text-white transition-colors">About Kipchimatt</a>
                    <a href="#" className="hover:text-white transition-colors">Careers & Job Openings</a>
                    <a href="#" className="hover:text-white transition-colors">Our Kenyan Partners</a>
                    <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    <button 
                      onClick={() => setCurrentView('admin')}
                      className="w-fit bg-plum-dark/50 hover:bg-plum-dark/70 border border-white/10 text-white font-bold py-1.5 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Laptop className="w-3.5 h-3.5 text-pink-200" />
                      <span>Admin Portal Console</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Badge Row */}
              <div className="border-t border-white/10 pt-5 mt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] text-white/60 uppercase tracking-widest font-extrabold mr-2">We Accept</span>
                  <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg font-bold text-white/85 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                    <span>M-PESA (POD)</span>
                  </span>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-lg">Visa</span>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-lg">Mastercard</span>
                  <span className="bg-white/10 text-white font-semibold">Cash on Delivery</span>
                </div>
                
                <p className="text-white/60 text-[11px] font-bold">
                  &copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved. Delighting Kenyan households daily.
                </p>
              </div>

            </div>
          </footer>

        </div>
      ) : currentView === 'cart' ? (
        <CartPage 
          cart={cart}
          settings={settings}
          onQtyChange={handleQtyChange}
          onRemoveItem={handleRemoveCartItem}
          deliveryLocation={deliveryLocation}
          onDeliveryLocationChange={handleDeliveryLocationChange}
          onPlaceOrder={handlePlaceOrder}
          onBackToShop={() => {
            setCurrentView('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          orders={orders}
        />
      ) : (
        /* Back-Office Operational Console Dashboard */
        <AdminPortal 
          products={products}
          orders={orders}
          settings={settings}
          onProductsChange={setProducts}
          onOrdersChange={setOrders}
          onSettingsChange={setSettings}
          isLoggedIn={isLoggedIn}
          onLogin={() => {
            sessionStorage.setItem('kipchimatt_admin', '1');
            setIsLoggedIn(true);
          }}
          onLogout={() => {
            sessionStorage.removeItem('kipchimatt_admin');
            setIsLoggedIn(false);
            handleDeliveryLocationChange('Nairobi');
            setCurrentView('shop');
          }}
          onShowToast={showToast}
          adminAlerts={adminAlerts}
          onTriggerLowStockEmail={handleTriggerLowStockEmail}
        />
      )}

      {/* --- Universal Overlay Components --- */}
      
      {/* Sliding Carts Drawer */}
      <CartSidebar 
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        settings={settings}
        onQtyChange={handleQtyChange}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setCartOpen(false);
          setCurrentView('cart');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Saved items sidebar */}
      <WishlistSidebar 
        isOpen={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        wishlist={wishlist}
        products={products}
        onRemoveWish={handleToggleWishlist}
        onAddToCart={(p) => {
          handleAddToCart(p);
          setWishlistOpen(false);
          setCartOpen(true);
        }}
      />

      {/* Secure Checkout Billing modal */}
      <CheckoutModal 
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        settings={settings}
        deliveryLocation={deliveryLocation}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Restricted Liquor Age Gate modal */}
      <AgeGateModal 
        isOpen={ageGateOpen}
        onConfirm={handleAgeConfirm}
      />

      {/* Dynamic Detailed Product Page Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          products={products}
          settings={settings}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
          deliveryLocation={deliveryLocation}
          onNavigateToProduct={setSelectedProduct}
          onAddReview={handleAddReview}
          customer={currentCustomer}
          orders={orders}
        />
      )}

      {/* Floating dynamic status toast message notifications stack */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none select-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl shadow-xl text-white font-bold text-xs flex items-center gap-2 max-w-sm pointer-events-auto animate-toast-in ${toast.type === 'success' ? 'bg-green' : toast.type === 'error' ? 'bg-red' : 'bg-gray-800'}`}
          >
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>

      {/* Floating Specs Compare Bottom Tray Bar */}
      {comparedProducts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 dark:bg-black/95 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 border border-white/10 max-w-[95vw] md:max-w-xl transition-all duration-300">
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-yellow">Compare Tray</h4>
            <span className="text-[10px] text-gray-300 font-bold">{comparedProducts.length} of 3 items selected</span>
            <div className="flex gap-2 mt-1.5">
              {comparedProducts.map(p => (
                <div key={p.id} className="relative group">
                  <img src={p.image} className="w-8 h-8 rounded-md object-cover border border-white/20" alt={p.name} />
                  <button 
                    onClick={() => handleToggleCompare(p)}
                    className="absolute -top-1 -right-1 bg-red text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold hover:bg-red-light cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCompareOpen(true)}
              className="bg-orange hover:bg-orange/80 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase shadow-lg cursor-pointer transition-colors"
            >
              Compare
            </button>
            <button 
              onClick={() => setComparedProducts([])}
              className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      <CompareModal 
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        products={comparedProducts}
        onRemove={(id) => {
          const prod = products.find(p => p.id === id);
          if (prod) handleToggleCompare(prod);
        }}
        onAddToCart={handleAddToCart}
        addedProductId={null}
      />

      {/* User Profile / Order Tracking Modal */}
      <UserProfileModal 
        isOpen={userProfileOpen}
        onClose={() => setUserProfileOpen(false)}
        customer={currentCustomer}
        orders={orders}
        onLoginCustomer={handleLoginCustomer}
        onLogoutCustomer={handleLogoutCustomer}
      />

      {/* Integrated Aligned Accessibility & Navigation Controls */}
      <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5">
        {scrollY > 300 && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-plum hover:bg-plum-dark text-white p-3.5 rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all border border-white/20 flex items-center justify-center"
            title="Go to Top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setAccessibilityOpen(prev => !prev)}
            className="bg-plum hover:bg-plum-dark text-white p-3.5 rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all border border-white/20 flex items-center justify-center"
            title="Accessibility Options"
          >
            <Settings className={`w-5 h-5 ${accessibilityOpen ? 'animate-spin' : ''}`} />
          </button>

          {accessibilityOpen && (
            <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-2xl w-72 space-y-4 animate-scale-up text-gray-800 dark:text-gray-100 border-r-4 border-r-plum">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-gray-800 dark:text-white">
                  <Eye className="w-4.5 h-4.5 text-plum" />
                  <span>Accessibility Hub</span>
                </h3>
                <button 
                  onClick={() => setAccessibilityOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Font Resize Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>Font Scaling</span>
                  <span className="text-plum font-extrabold">{Math.round(fontSizeScale * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFontSizeScale(Math.max(0.85, fontSizeScale - 0.15))}
                    className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-200"
                  >
                    A-
                  </button>
                  <input 
                    type="range"
                    min="0.85"
                    max="1.45"
                    step="0.15"
                    value={fontSizeScale}
                    onChange={(e) => setFontSizeScale(parseFloat(e.target.value))}
                    className="flex-1 accent-plum"
                  />
                  <button 
                    onClick={() => setFontSizeScale(Math.min(1.45, fontSizeScale + 0.15))}
                    className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-200"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* High Contrast Mode Toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-850 dark:text-gray-100">High Contrast</span>
                  <span className="text-[10px] text-plum font-extrabold uppercase tracking-wider">Always Enabled</span>
                </div>
                <input 
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded border-gray-350 dark:border-gray-750 text-plum focus:ring-plum w-4 h-4 opacity-70 cursor-not-allowed"
                />
              </div>

              {/* Monochrome Mode Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none py-1">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Monochrome / Grayscale</span>
                <input 
                  type="checkbox"
                  checked={monochrome}
                  onChange={() => setMonochrome(!monochrome)}
                  className="rounded border-gray-350 dark:border-gray-750 text-plum focus:ring-plum w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Reset Defaults button */}
              <button
                onClick={() => {
                  setFontSizeScale(1);
                  setHighContrast(true);
                  setMonochrome(false);
                  showToast('Accessibility preferences reset.', 'info');
                }}
                className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-[10px] font-extrabold text-gray-600 dark:text-gray-300 uppercase tracking-widest py-2 rounded-xl transition-colors cursor-pointer"
              >
                Reset Preferences
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Urgent Purchase Popup Notification Modal */}
      {urgentStockProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-fade-in">
          <div className="bg-white dark:bg-gray-950 rounded-3xl border-2 border-plum/40 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-scale-up relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red animate-pulse" />
            
            <button 
              onClick={() => setUrgentStockProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 text-red flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center justify-center gap-1.5">
                <Sparkles className="w-5 h-5 text-yellow fill-yellow animate-pulse" />
                <span>Demand is Extremely High!</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                You added <strong className="text-plum font-bold">{urgentStockProduct.name}</strong> to your basket.
              </p>
            </div>

            {/* Product card inside alert */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl flex items-center gap-3">
              <img src={urgentStockProduct.image} alt={urgentStockProduct.name} className="w-14 h-14 object-cover rounded-xl border border-gray-200 dark:border-gray-850" />
              <div className="text-left flex-1 min-w-0">
                <span className="text-[10px] text-red font-extrabold uppercase tracking-widest block animate-pulse">
                  Only {urgentStockProduct.stock} Left In Stock!
                </span>
                <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-100 truncate">{urgentStockProduct.name}</h4>
                <p className="text-sm font-black text-plum mt-0.5">{formatMoney(urgentStockProduct.price)}</p>
              </div>
            </div>

            {/* Order reservation countdown */}
            <div className="p-3 bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-900/20 rounded-xl">
              <span className="text-[10px] text-red-700 dark:text-red-300 font-extrabold uppercase tracking-widest block">Cart Reservation Clock</span>
              <span className="font-mono text-xl font-extrabold text-red dark:text-red-400 block mt-0.5">
                {formatUrgentTime(urgentTimer)}
              </span>
              <span className="text-[9px] text-gray-400 block mt-0.5">Secure your items before they sell out!</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setUrgentStockProduct(null);
                  setCheckoutOpen(true);
                }}
                className="w-full bg-plum hover:bg-plum-dark text-white font-black text-xs sm:text-sm py-3 px-6 rounded-2xl cursor-pointer transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 uppercase tracking-wider animate-pulse"
              >
                <CreditCard className="w-4 h-4" />
                <span>Express Checkout Now</span>
              </button>
              <button
                onClick={() => setUrgentStockProduct(null)}
                className="w-full bg-white dark:bg-transparent border border-gray-250 dark:border-gray-800 hover:bg-gray-50 text-gray-600 dark:text-gray-300 font-bold text-xs py-2.5 rounded-2xl cursor-pointer transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden google translate container to prevent initialization scripts from throwing a Script error */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>

    </div>
  );
}
