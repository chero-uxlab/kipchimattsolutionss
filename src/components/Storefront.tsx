import React, { useRef, useState, useEffect } from 'react';
import { 
  LayoutGrid, Boxes, Carrot, Coffee, Baby, Plug, Sparkles, Wine, 
  Pencil, PawPrint, Wrench, Armchair, ChevronLeft, ChevronRight, 
  Heart, ShoppingCart, Check, Star, AlertCircle, Sparkle,
  HeartPulse, Shirt, Trophy, BookOpen
} from 'lucide-react';
import { Product, StoreSettings, Order, Customer, CartItem } from '../types';
import { categoryMeta, formatMoney, calcDiscount } from '../data/catalog';

interface StorefrontProps {
  products: Product[];
  settings: StoreSettings;
  wishlist: number[];
  onToggleWishlist: (id: number) => void;
  onAddToCart: (product: Product) => void;
  onCategorySelect: (cat: string) => void;
  onBrandSelect: (brand: string) => void;
  onProductClick: (product: Product) => void;
  activeCategory: string;
  activeSearch: string;
  comparedProductIds: number[];
  onToggleCompare: (product: Product) => void;
  orders?: Order[];
  currentCustomer?: Customer | null;
  cart: CartItem[];
}

export default function Storefront({
  products,
  settings,
  wishlist,
  onToggleWishlist,
  onAddToCart,
  onCategorySelect,
  onBrandSelect,
  onProductClick,
  activeCategory,
  activeSearch,
  comparedProductIds,
  onToggleCompare,
  orders = [],
  currentCustomer = null,
  cart
}: StorefrontProps) {
  
  // Carousel DOM refs
  const dealsRef = useRef<HTMLDivElement>(null);
  const freshRef = useRef<HTMLDivElement>(null);
  const beverageRef = useRef<HTMLDivElement>(null);
  const liquorRef = useRef<HTMLDivElement>(null);

  // Quick feedback state for Add to Cart
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  // Sorting and Loading Skeleton states
  const [sortBy, setSortBy] = useState<string>('default');
  const [loading, setLoading] = useState(false);

  // Trigger quick simulated loading skeleton on category, search or sorting change
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeCategory, activeSearch, sortBy]);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, dir: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir * 420, behavior: 'smooth' });
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutGrid': return <LayoutGrid className="w-5 h-5" />;
      case 'Boxes': return <Boxes className="w-5 h-5" />;
      case 'Carrot': return <Carrot className="w-5 h-5" />;
      case 'Coffee': return <Coffee className="w-5 h-5" />;
      case 'Baby': return <Baby className="w-5 h-5" />;
      case 'Plug': return <Plug className="w-5 h-5" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5" />;
      case 'Wine': return <Wine className="w-5 h-5" />;
      case 'Pencil': return <Pencil className="w-5 h-5" />;
      case 'PawPrint': return <PawPrint className="w-5 h-5" />;
      case 'Wrench': return <Wrench className="w-5 h-5" />;
      case 'Armchair': return <Armchair className="w-5 h-5" />;
      case 'HeartPulse': return <HeartPulse className="w-5 h-5" />;
      case 'Shirt': return <Shirt className="w-5 h-5" />;
      case 'Trophy': return <Trophy className="w-5 h-5" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5" />;
      default: return <LayoutGrid className="w-5 h-5" />;
    }
  };

  // Filter products based on search or category
  const getFilteredProducts = () => {
    let list = [...products];
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    } else if (activeCategory && activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory);
    }

    // Apply active sort select choice
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating-desc') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  };

  // Find recommended products based on categories of items in the wishlist and previous purchases
  const getRecommendedProducts = () => {
    // 1. Check purchased categories from previous orders
    let purchasedCategories: string[] = [];
    
    // Find orders for current customer
    const customerOrders = currentCustomer && orders
      ? orders.filter(o => o.customer.phone.trim().toLowerCase() === currentCustomer.phone.trim().toLowerCase())
      : [];
      
    if (customerOrders.length > 0) {
      const purchasedItemNames = new Set<string>();
      customerOrders.forEach(o => {
        o.items.forEach(item => {
          purchasedItemNames.add(item.name.toLowerCase());
          // Find the product to get its category
          const prod = products.find(p => p.name.toLowerCase() === item.name.toLowerCase() || p.id === item.id);
          if (prod && !purchasedCategories.includes(prod.category)) {
            purchasedCategories.push(prod.category);
          }
        });
      });
    }

    // 2. Check wishlist categories
    const wishlistedProds = products.filter(p => wishlist.includes(p.id));
    const wishlistCategories = Array.from(new Set(wishlistedProds.map(p => p.category)));

    // Combined preferred categories (purchased first, then wishlist)
    const preferredCategories = Array.from(new Set([...purchasedCategories, ...wishlistCategories]));

    if (preferredCategories.length === 0) {
      // Fallback: high-rated trending items
      return {
        isFallback: true,
        reason: 'trending',
        items: products.filter(p => (p.rating || 0) >= 4.7 && !wishlist.includes(p.id)).slice(0, 5)
      };
    }

    // Get suggestions from these categories, excluding products already purchased or wishlisted
    const alreadyPurchasedIds = new Set<number>();
    customerOrders.forEach(o => o.items.forEach(item => alreadyPurchasedIds.add(item.id)));

    const suggestions = products.filter(p => 
      preferredCategories.includes(p.category) && 
      !wishlist.includes(p.id) &&
      !alreadyPurchasedIds.has(p.id)
    );

    if (suggestions.length > 0) {
      return {
        isFallback: false,
        reason: purchasedCategories.length > 0 ? 'purchased' : 'wishlist',
        items: suggestions.slice(0, 5)
      };
    }
    
    return {
      isFallback: true,
      reason: 'trending',
      items: products.filter(p => (p.rating || 0) >= 4.7 && !wishlist.includes(p.id)).slice(0, 5)
    };
  };

  const recommendationData = getRecommendedProducts();

  const getFrequentlyBoughtTogether = () => {
    if (cart.length === 0) return [];

    const cartProductIds = new Set(cart.map(item => item.id));
    const coOccurrences: Record<number, number> = {};

    orders.forEach(order => {
      const hasCartProduct = order.items.some(item => cartProductIds.has(item.id));
      if (hasCartProduct) {
        order.items.forEach(item => {
          if (!cartProductIds.has(item.id)) {
            coOccurrences[item.id] = (coOccurrences[item.id] || 0) + item.qty;
          }
        });
      }
    });

    let recommended = Object.entries(coOccurrences)
      .map(([idStr, score]) => {
        const id = Number(idStr);
        const product = products.find(p => p.id === id);
        return { product, score };
      })
      .filter((item): item is { product: Product; score: number } => !!item.product && item.product.stock > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);

    if (recommended.length < 3) {
      const cartCategories = new Set(
        cart.map(item => {
          const prod = products.find(p => p.id === item.id);
          return prod ? prod.category : '';
        }).filter(Boolean)
      );
      const complementary = products.filter(p => 
        !cartProductIds.has(p.id) && 
        p.stock > 0 &&
        (cartCategories.has(p.category) || p.rating >= 4.7)
      );
      const existingIds = new Set(recommended.map(p => p.id));
      complementary.forEach(p => {
        if (!existingIds.has(p.id)) {
          recommended.push(p);
        }
      });
    }

    return recommended.slice(0, 3);
  };

  const handleAddToCartClick = (p: Product) => {
    onAddToCart(p);
    setAddedProductId(p.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  // Render standard product card
  const renderProductCard = (p: Product, showBadge = false) => {
    const isWished = wishlist.includes(p.id);
    const discount = calcDiscount(p.price, p.originalPrice);
    const isOutOfStock = p.stock <= 0;
    const isLowStock = !isOutOfStock && p.stock <= settings.lowStockThreshold;

    return (
      <div 
        key={p.id} 
        className="bg-white rounded-xl overflow-hidden border border-gray-150 hover:border-plum/20 hover:shadow-xl transition-all duration-300 flex flex-col group relative"
      >
        <div 
          onClick={() => onProductClick(p)}
          className="h-44 sm:h-48 bg-gray-50 flex items-center justify-center relative overflow-hidden cursor-pointer"
        >
          <img 
            src={p.image || 'https://via.placeholder.com/400?text=Kipchimatt'} 
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Grocery';
            }}
          />
          
          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-plum text-white font-extrabold text-[10px] px-2.5 py-1 rounded shadow-sm">
              -{discount}%
            </span>
          )}

          {showBadge && discount > 0 && (
            <span className="absolute top-2.5 right-2.5 bg-plum text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-0.5">
              <Sparkle className="w-2.5 h-2.5" />
              <span>Deal</span>
            </span>
          )}

          <button 
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(p.id); }}
            className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform duration-200 hover:scale-115 ${isWished ? 'bg-plum-fade text-plum' : 'bg-white/90 text-gray-400 hover:text-plum'}`}
            title={isWished ? 'Remove from wishlist' : 'Save for later'}
          >
            <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] text-plum font-black uppercase tracking-widest truncate">
              {p.brand || 'Kipchimatt'}
            </span>
            {p.rating && (
              <div className="flex items-center gap-0.5 text-xs text-plum font-bold" title={`${p.rating} / 5 Customer Rating`}>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = starVal <= Math.round(p.rating || 0);
                    return (
                      <Star 
                        key={starVal} 
                        className={`w-2.5 h-2.5 ${isFilled ? 'fill-plum text-plum' : 'text-gray-200'}`} 
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] text-gray-500 font-black ml-1">({p.rating})</span>
              </div>
            )}
          </div>
          <h4 
            onClick={() => onProductClick(p)}
            className="font-bold text-gray-800 text-xs sm:text-sm line-clamp-2 h-9 sm:h-10 leading-tight mb-2 group-hover:text-plum transition-colors cursor-pointer"
          >
            {p.name}
          </h4>

          <div className="mb-3">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-extrabold text-plum">
                {formatMoney(p.price)}
              </span>
              {p.originalPrice > p.price && (
                <span className="text-[11px] text-gray-400 line-through">
                  {formatMoney(p.originalPrice)}
                </span>
              )}
            </div>
            {p.originalPrice > p.price && (
              <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">
                Save {formatMoney(p.originalPrice - p.price)} ({discount}%)
              </span>
            )}
            
            <label className="flex items-center gap-1.5 mt-2.5 cursor-pointer select-none text-[11px] font-bold text-gray-500 hover:text-plum dark:text-gray-450">
              <input 
                type="checkbox"
                checked={comparedProductIds.includes(p.id)}
                onChange={(e) => { e.stopPropagation(); onToggleCompare(p); }}
                className="rounded border-gray-350 dark:border-gray-755 text-plum focus:ring-plum w-3.5 h-3.5 cursor-pointer"
              />
              <span>Compare specs</span>
            </label>
          </div>

          <div className="mt-auto">
            {isOutOfStock ? (
              <div className="text-center text-[10px] font-bold text-plum bg-plum-fade py-1 rounded-md mb-2 flex items-center justify-center gap-1.5 border border-plum/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sold Out</span>
              </div>
            ) : isLowStock ? (
              <div className="text-center text-[10px] font-bold text-amber-600 bg-amber-50 py-1 rounded-md mb-2 border border-amber-100/50">
                Only {p.stock} left in stock
              </div>
            ) : null}

            <button 
              onClick={() => handleAddToCartClick(p)}
              disabled={isOutOfStock}
              className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : addedProductId === p.id ? 'bg-emerald-600 text-white' : 'bg-plum text-white hover:bg-plum-dark'}`}
            >
              {addedProductId === p.id ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render secondary product card using a different styling/color combination
  const renderSecondaryProductCard = (p: Product) => {
    const isWished = wishlist.includes(p.id);
    const discount = calcDiscount(p.price, p.originalPrice);
    const isOutOfStock = p.stock <= 0;
    const isLowStock = !isOutOfStock && p.stock <= settings.lowStockThreshold;

    return (
      <div 
        key={p.id} 
        className="bg-white rounded-xl overflow-hidden border border-gray-150 hover:border-plum/40 hover:shadow-2xl transition-all duration-300 flex flex-col group relative"
      >
        <div 
          onClick={() => onProductClick(p)}
          className="h-44 sm:h-48 bg-gray-50 flex items-center justify-center relative overflow-hidden cursor-pointer"
        >
          <img 
            src={p.image || 'https://via.placeholder.com/400?text=Kipchimatt'} 
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Kipchimatt';
            }}
          />
          
          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-plum text-white font-black text-[10px] px-2.5 py-1 rounded shadow-sm">
              -{discount}%
            </span>
          )}

          <span className="absolute top-2.5 right-2.5 bg-plum-fade text-plum font-black text-[9px] px-2.5 py-0.5 rounded uppercase tracking-wider shadow-sm border border-plum/15">
            {p.category}
          </span>

          <button 
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(p.id); }}
            className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform duration-200 hover:scale-115 ${isWished ? 'bg-plum-fade text-plum' : 'bg-white/95 text-gray-400 hover:text-plum'}`}
            title={isWished ? 'Remove from wishlist' : 'Save for later'}
          >
            <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] text-plum font-black uppercase tracking-widest truncate">
              {p.brand || 'Lifestyle'}
            </span>
            {p.rating && (
              <div className="flex items-center gap-0.5 text-xs text-plum font-bold" title={`${p.rating} / 5 Customer Rating`}>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = starVal <= Math.round(p.rating || 0);
                    return (
                      <Star 
                        key={starVal} 
                        className={`w-2.5 h-2.5 ${isFilled ? 'fill-plum text-plum' : 'text-gray-200'}`} 
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] text-gray-500 font-black ml-1">({p.rating})</span>
              </div>
            )}
          </div>
          <h4 
            onClick={() => onProductClick(p)}
            className="font-black text-gray-800 text-xs sm:text-sm line-clamp-2 h-9 sm:h-10 leading-tight mb-2 group-hover:text-plum transition-colors cursor-pointer"
          >
            {p.name}
          </h4>

          <div className="mb-3">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-extrabold text-plum">
                {formatMoney(p.price)}
              </span>
              {p.originalPrice > p.price && (
                <span className="text-[11px] text-gray-400 line-through">
                  {formatMoney(p.originalPrice)}
                </span>
              )}
            </div>
            {p.originalPrice > p.price && (
              <span className="text-[10px] text-green font-extrabold block mt-0.5">
                Save {formatMoney(p.originalPrice - p.price)} ({discount}%)
              </span>
            )}
            
            <label className="flex items-center gap-1.5 mt-2.5 cursor-pointer select-none text-[11px] font-bold text-gray-500 hover:text-plum dark:text-gray-450">
              <input 
                type="checkbox"
                checked={comparedProductIds.includes(p.id)}
                onChange={(e) => { e.stopPropagation(); onToggleCompare(p); }}
                className="rounded border-gray-350 dark:border-gray-755 text-plum focus:ring-plum w-3.5 h-3.5 cursor-pointer"
              />
              <span>Compare specs</span>
            </label>
          </div>

          <div className="mt-auto">
            {isOutOfStock ? (
              <div className="text-center text-[10px] font-bold text-plum bg-plum-fade py-1 rounded-md mb-2 flex items-center justify-center gap-1.5 border border-plum/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sold Out</span>
              </div>
            ) : isLowStock ? (
              <div className="text-center text-[10px] font-bold text-plum bg-plum-fade py-1 rounded-md mb-2 border border-plum/15">
                Only {p.stock} left in stock
              </div>
            ) : null}

            <button 
              onClick={() => handleAddToCartClick(p)}
              disabled={isOutOfStock}
              className={`w-full py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors uppercase tracking-wider ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : addedProductId === p.id ? 'bg-plum-light text-white' : 'bg-plum text-white hover:bg-plum-light'}`}
            >
              {addedProductId === p.id ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{isOutOfStock ? 'Out of Stock' : 'Add to Basket'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getSecondaryPartProducts = () => {
    const primaryCategories = ['food cupboard', 'fresh food', 'beverages', 'liquor'];
    return products.filter(p => !primaryCategories.includes(p.category)).slice(0, 10);
  };

  // Filter lists for shelfs
  const deals = products.filter(p => p.originalPrice > p.price);
  const fresh = products.filter(p => p.category === 'fresh food');
  const beverages = products.filter(p => p.category === 'beverages');
  const liquor = products.filter(p => p.category === 'liquor');

  // Groups for Brand Chips section
  const brandGroupCategories = [
    { title: 'Food Cupboard', cat: 'food cupboard' },
    { title: 'Fresh Food & Dairy', cat: 'fresh food' },
    { title: 'Beverages', cat: 'beverages' },
    { title: 'Baby & Kids', cat: 'baby & kids' },
    { title: 'Electronics', cat: 'electronics' },
    { title: 'Beauty & Personal Care', cat: 'beauty' },
  ];

  const categoryBanners: Record<string, { title: string; subtitle: string; bg: string }> = {
    'all': {
      title: 'Our Premium Digital Catalog',
      subtitle: 'Browse thousands of authentic local products, handpicked quality groceries, electronics, and daily essentials with same-day express delivery.',
      bg: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200'
    },
    'food cupboard': {
      title: 'Pantry & Food Cupboard Essentials',
      subtitle: 'Stock up your kitchen with high-quality grains, unga, cooking oils, premium spices, pastas, and premium shelf-stable ingredients.',
      bg: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1200'
    },
    'fresh food': {
      title: 'Fresh Food, Farm Fruits & Dairy',
      subtitle: 'Crisp organic vegetables, sweet seasonal fruits, local pasture milk, delicious yogurts, and farm-fresh poultry products delivered chilled.',
      bg: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&q=80&w=1200'
    },
    'beverages': {
      title: 'Energizing Beverages & Fine Coffees',
      subtitle: 'Rich Kenyan highland coffees, organic calming herbal teas, freshly squeezed fruit juices, and carbonated sodas for any celebration.',
      bg: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=1200'
    },
    'baby & kids': {
      title: 'Nurturing Baby & Kids Essentials',
      subtitle: 'Safe organic baby foods, ultra-soft diapers, gentle derm-care lotions, and creative educational toys designed to spark early imaginations.',
      bg: 'https://images.unsplash.com/photo-1515488042361-404e9250afef?auto=format&fit=crop&q=80&w=1200'
    },
    'electronics': {
      title: 'Smart Electronics & Home Gadgets',
      subtitle: 'Enhance your lifestyle with state-of-the-art mobile accessories, kitchen appliances, and high-quality entertainment setups.',
      bg: 'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&q=80&w=1200'
    },
    'cleaning': {
      title: 'Effective Home Care & Cleaning Gear',
      subtitle: 'Keep your sanctuary sparkling and sanitized with eco-safe powerful detergents, multi-surface sprays, and sturdy cleaning tools.',
      bg: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200'
    },
    'beauty': {
      title: 'Beauty, Cosmetics & Personal Wellness',
      subtitle: 'Glow with dermatologist-loved skincare serums, refreshing hygiene products, rich body oils, and elegant makeup essentials.',
      bg: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1200'
    },
    'liquor': {
      title: 'Premium Spirits, Craft Beers & Wines',
      subtitle: 'Treat yourself to curated fine wines, single malt scotch whiskeys, craft rums, and perfectly brewed cold lagers.',
      bg: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=1200'
    },
    'stationery': {
      title: 'School & Corporate Office Stationery',
      subtitle: 'Excellent writing utensils, executive notebooks, colorful organization binders, art sketchpads, and helpful office desk accessories.',
      bg: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200'
    },
    'pet': {
      title: 'Gourmet Pet Food & Loving Care Supplies',
      subtitle: 'Only the best crunchy kibbles, tasty cat treats, orthopedic pet beds, safe grooming brushes, and fun active toys for your fur family.',
      bg: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=1200'
    },
    'hardware': {
      title: 'Robust Hardware & DIY Repair Tools',
      subtitle: 'Equip your home workshop with reliable power drills, heavy-duty hammer kits, screwdrivers, fast-curing adhesives, and anchors.',
      bg: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&q=80&w=1200'
    },
    'furniture': {
      title: 'Modern Furniture & Intimate Home Decor',
      subtitle: 'Lounge in style with hand-tufted statement sofas, ergonomic workstations, atmospheric lamps, and elegant organizational shelving.',
      bg: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200'
    }
  };

  const currentBanner = categoryBanners[activeCategory] || categoryBanners['all'];

  return (
    <div className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {loading ? (
          /* PREMIUM SHIMMERING SKELETON UI FOR BOTH HOME AND FILTER VIEW */
          <div className="space-y-12 py-6">
            {/* Banner skeleton */}
            <div className="w-full h-44 sm:h-56 md:h-64 rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            
            {/* Category tiles skeleton */}
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-48 animate-pulse" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-4 text-center space-y-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 mx-auto" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel shelves skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-64 animate-pulse" />
                <div className="flex gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="min-w-[210px] bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-2xl space-y-4 animate-pulse">
                    <div className="h-44 bg-gray-200 dark:bg-gray-800 rounded-xl w-full" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeSearch || (activeCategory && activeCategory !== 'all') ? (
          <section className="py-6 min-h-[400px]">
            
            {/* STUNNING CATEGORY HERO BANNER */}
            {!activeSearch && (
              <div 
                className="w-full h-44 sm:h-56 md:h-64 rounded-3xl overflow-hidden mb-8 relative flex items-center justify-start p-6 sm:p-10 shadow-lg border border-gray-100 dark:border-gray-800 transition-all group hover:shadow-xl"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(120, 32, 69, 0.95) 20%, rgba(120, 32, 69, 0.7) 50%, rgba(0, 0, 0, 0.2) 100%), url(${currentBanner.bg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="max-w-xl text-white space-y-2 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-400 text-gray-900 px-3 py-1 rounded-full inline-block mb-1 shadow-md">
                    Featured Category
                  </span>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight drop-shadow-md text-white">
                    {currentBanner.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-150 leading-relaxed font-semibold drop-shadow max-w-lg opacity-90">
                    {currentBanner.subtitle}
                  </p>
                  <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-yellow-300 uppercase tracking-widest">
                    <span>Express 45-Min Shipping</span>
                    <span>•</span>
                    <span>100% Quality Guaranteed</span>
                  </div>
                </div>
                {/* Visual accent circles */}
                <div className="absolute right-10 bottom-10 w-24 h-24 rounded-full border-4 border-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute right-16 top-10 w-12 h-12 rounded-full border border-white/5 pointer-events-none group-hover:translate-x-3 transition-transform duration-500" />
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-plum/5 rounded-xl text-plum">
                  <LayoutGrid className="w-5 h-5 text-plum" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-800 flex items-center gap-2">
                    <span>
                      {activeSearch 
                        ? `Search Results for "${activeSearch}"` 
                        : activeCategory === 'all'
                        ? 'All Kikapu Products'
                        : categoryMeta.find(c => c.key === activeCategory)?.label || 'Products'}
                    </span>
                    <span className="text-xs bg-plum/10 text-plum font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {getFilteredProducts().length} Items
                    </span>
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
                {/* SORTING SELECT DROPDOWN */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Sort by:</span>
                  <select 
                    id="store-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-gray-250 text-gray-700 text-xs font-extrabold px-3 py-1.5 rounded-xl outline-none focus:border-plum focus:ring-1 focus:ring-plum cursor-pointer"
                  >
                    <option value="default">Default / Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating-desc">Rating: High to Low</option>
                  </select>
                </div>

                {(activeSearch || activeCategory !== 'all' || sortBy !== 'default') && (
                  <button 
                    onClick={() => { onCategorySelect('all'); onBrandSelect(''); setSortBy('default'); }}
                    className="text-xs font-black text-plum bg-plum/5 hover:bg-plum/10 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              /* PREMIUM SHIMMERING SKELETON UI */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, sIdx) => (
                  <div key={sIdx} className="bg-white rounded-2xl overflow-hidden border border-gray-150 p-4 space-y-4 animate-pulse">
                    <div className="h-44 bg-gray-100 rounded-xl w-full" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-4 bg-gray-100 rounded w-5/6" />
                      <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                    </div>
                    <div className="h-9 bg-gray-100 rounded-lg w-full mt-4" />
                  </div>
                ))}
              </div>
            ) : getFilteredProducts().length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {getFilteredProducts().map(p => renderProductCard(p, true))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-150 p-8 max-w-md mx-auto shadow-sm">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-extrabold text-gray-800 text-base mb-1">No products found</h3>
                <p className="text-gray-500 text-xs mb-6">We couldn't find matches for your search. Try adjusting terms or selecting a category.</p>
                <button 
                  onClick={() => { onCategorySelect('all'); onBrandSelect(''); }}
                  className="bg-plum hover:bg-plum-dark text-white text-xs font-bold px-6 py-2.5 rounded-full cursor-pointer transition-colors shadow-sm"
                >
                  Show All Products
                </button>
              </div>
            )}
          </section>
        ) : (
          /* Storefront Homepage view */
          <>
            {/* Shop by Category Grid Tiles */}
            <section className="py-6">
              <div className="mb-4">
                <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-plum" />
                  <span>Shop by Category</span>
                </h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {categoryMeta.map(c => (
                  <div 
                    key={c.key}
                    onClick={() => onCategorySelect(c.key)}
                    className="bg-white border border-gray-150 rounded-xl p-4 text-center cursor-pointer transition-all duration-200 hover:border-plum hover:shadow-md hover:-translate-y-0.5 select-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-plum/5 text-plum flex items-center justify-center mx-auto mb-2">
                      {getCategoryIcon(c.icon)}
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 block line-clamp-1">{c.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Frequently Bought Together Add-ons */}
            {cart.length > 0 && getFrequentlyBoughtTogether().length > 0 && (
              <section className="py-6 bg-plum/5 dark:bg-pink-950/10 rounded-3xl p-5 border border-plum/15 dark:border-pink-800/20 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-black text-plum dark:text-pink-300 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                      <span>Frequently Bought Together Add-ons</span>
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                      Based on items currently in your cart, customers also buy these items together:
                    </p>
                  </div>
                  <span className="text-[9px] bg-plum text-white font-black uppercase px-2.5 py-1 rounded-full tracking-wider self-start sm:self-auto shadow-sm">
                    Kikapu Smart Suggest
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getFrequentlyBoughtTogether().map(p => {
                    const isOutOfStock = p.stock <= 0;
                    return (
                      <div 
                        key={p.id} 
                        className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-xl p-3 flex items-center gap-3.5 hover:shadow-lg transition-all"
                      >
                        <div 
                          onClick={() => onProductClick(p)}
                          className="w-14 h-14 bg-gray-50 dark:bg-gray-850 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        >
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Grocery';
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 
                            onClick={() => onProductClick(p)}
                            className="font-bold text-gray-800 dark:text-white text-xs line-clamp-1 hover:text-plum dark:hover:text-pink-300 cursor-pointer"
                          >
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-bold block">{p.brand}</span>
                          <span className="text-xs font-black text-plum dark:text-pink-400 mt-0.5 block">
                            {formatMoney(p.price)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAddToCartClick(p)}
                          disabled={isOutOfStock}
                          className={`px-3 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                            isOutOfStock 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : addedProductId === p.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-gray-950 hover:bg-amber-400 hover:scale-105'
                          }`}
                        >
                          {addedProductId === p.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <span>+ Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Kikapu Chapchap Deals Carousel */}
            {deals.length > 0 && (
              <section className="py-6" id="deals-shelf">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                    <Star className="w-5 h-5 text-plum fill-plum" />
                    <span>Kikapu Chapchap Deals</span>
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => scrollCarousel(dealsRef, -1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => scrollCarousel(dealsRef, 1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div 
                  ref={dealsRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-none snap-x snap-mandatory"
                >
                  {deals.slice(0, 10).map(p => (
                    <div key={p.id} className="min-w-[210px] max-w-[210px] snap-start">
                      {renderProductCard(p, true)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Popular Products Grid */}
            <section className="py-6">
              <div className="mb-4">
                <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-plum" />
                  <span>Popular Products</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.slice(0, 10).map(p => renderProductCard(p))}
              </div>
            </section>

            {/* Lifestyle & Household Essentials (Second Part of All Products - Different Combination) */}
            <section className="py-8 border-y border-gray-150 my-6 bg-gray-50/30 p-5 rounded-2xl dark:bg-gray-900/10">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-plum" />
                  <h2 className="text-base font-black text-gray-850 flex items-center gap-2">
                    <span>Lifestyle & Household Staples</span>
                    <span className="text-[9px] bg-plum-fade text-plum font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-plum/15">
                      Collection 2
                    </span>
                  </h2>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Explore a different combination of premium electronics, home wellness, baby care, pet supplies, and study essentials.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {getSecondaryPartProducts().map(p => renderSecondaryProductCard(p))}
              </div>
            </section>

            {/* Fresh Food Carousel */}
            {fresh.length > 0 && (
              <section className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                    <Carrot className="w-5 h-5 text-emerald-600" />
                    <span>Fresh from the Farm</span>
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => scrollCarousel(freshRef, -1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => scrollCarousel(freshRef, 1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div 
                  ref={freshRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-none snap-x snap-mandatory"
                >
                  {fresh.slice(0, 8).map(p => (
                    <div key={p.id} className="min-w-[210px] max-w-[210px] snap-start">
                      {renderProductCard(p)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Beverages Carousel */}
            {beverages.length > 0 && (
              <section className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-indigo-600" />
                    <span>Beverages</span>
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => scrollCarousel(beverageRef, -1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => scrollCarousel(beverageRef, 1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div 
                  ref={beverageRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-none snap-x snap-mandatory"
                >
                  {beverages.slice(0, 8).map(p => (
                    <div key={p.id} className="min-w-[210px] max-w-[210px] snap-start">
                      {renderProductCard(p)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Liquor Carousel */}
            {liquor.length > 0 && (
              <section className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                    <Wine className="w-5 h-5 text-amber-800" />
                    <span>Liquor & Spirits</span>
                    <span className="text-[10px] bg-red-50 text-red-600 font-extrabold px-2 py-0.5 rounded border border-red-100 uppercase tracking-widest">
                      18+ Only
                    </span>
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => scrollCarousel(liquorRef, -1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => scrollCarousel(liquorRef, 1)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-plum hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div 
                  ref={liquorRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-none snap-x snap-mandatory"
                >
                  {liquor.slice(0, 8).map(p => (
                    <div key={p.id} className="min-w-[210px] max-w-[210px] snap-start">
                      {renderProductCard(p)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recommended for You Section based on Previous Purchases/Wishlist (Positioned perfectly at the bottom) */}
            <section className="py-6 border-t border-gray-150 mt-4">
              <div className="mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                      <span>Recommended For You</span>
                      {!recommendationData.isFallback && (
                        <span className="text-[9px] bg-plum text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {recommendationData.reason === 'purchased' ? 'Based on Purchases' : 'Based on Wishlist'}
                        </span>
                      )}
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {recommendationData.isFallback 
                        ? 'Trending supermarket favorites we think you will love.' 
                        : recommendationData.reason === 'purchased'
                        ? 'Selected products based on your previously purchased categories.'
                        : 'Curated products matching categories in your wishlist.'}
                    </p>
                  </div>
                </div>
              </div>

              {recommendationData.isFallback && (
                <div className="mb-5 p-4 bg-plum/5 border border-plum/15 rounded-2xl text-xs text-gray-600 font-semibold flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-plum fill-plum" />
                  <span>
                    <strong>Personalize:</strong> Tap the heart icon on your favorite items or complete your first order to unlock smart, tailored recommendations matching your taste!
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recommendationData.items.map(p => (
                  <div key={p.id}>
                    {renderProductCard(p)}
                  </div>
                ))}
              </div>
            </section>

            {/* Shop by Brand Sections */}
            <section className="py-6 border-t border-gray-150 mt-4" id="brands-section">
              <div className="mb-6">
                <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                  <Star className="w-5 h-5 text-plum fill-plum" />
                  <span>Shop by Brand</span>
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">Explore by selecting your favorite domestic or international brand.</p>
              </div>

              <div className="bg-gray-50/50 dark:bg-gray-950/20 p-6 rounded-2xl border border-gray-150 dark:border-gray-800">
                <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                  {Array.from(
                    new Set(
                      products
                        .map(p => p.brand)
                        .filter(Boolean)
                    )
                  ).slice(0, 18).map(brand => (
                    <button
                      key={brand}
                      onClick={() => onBrandSelect(brand)}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-plum dark:hover:border-orange hover:text-plum dark:hover:text-orange font-extrabold text-xs px-5 py-2.5 rounded-full cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95 text-gray-750 dark:text-gray-250"
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
}
