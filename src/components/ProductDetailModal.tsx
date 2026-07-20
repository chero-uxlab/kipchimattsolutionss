import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Heart, ShoppingCart, Minus, Plus, Star, Award, Truck, ShieldCheck, 
  RotateCcw, Sparkles, MessageSquare, ListPlus, Send, ArrowRight, Check
} from 'lucide-react';
import { Product, StoreSettings, Customer, Order } from '../types';
import { formatMoney, calcDiscount, uid } from '../data/catalog';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: StoreSettings;
  wishlist: number[];
  onToggleWishlist: (id: number) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  deliveryLocation: string;
  onNavigateToProduct: (product: Product) => void;
  onAddReview: (productId: number, review: { userName: string; rating: number; comment: string }) => void;
  customer?: Customer | null;
  orders: Order[];
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  products,
  settings,
  wishlist,
  onToggleWishlist,
  onAddToCart,
  deliveryLocation,
  onNavigateToProduct,
  onAddReview,
  customer,
  orders
}: ProductDetailModalProps) {
  
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'reviews'>('overview');
  
  // Review submission state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Restock notification email success state
  const [restockSuccess, setRestockSuccess] = useState(false);

  // Analyze order history for "Frequently Bought Together"
  const suggestedItems = useMemo(() => {
    const occurrences: Record<number, number> = {};
    
    // Analyze order history
    if (orders && orders.length > 0) {
      orders.forEach(o => {
        const hasCurrent = o.items.some(item => item.id === product.id);
        if (hasCurrent) {
          o.items.forEach(item => {
            if (item.id !== product.id) {
              occurrences[item.id] = (occurrences[item.id] || 0) + 1;
            }
          });
        }
      });
    }

    // Sort products by bought frequency
    const sortedIds = Object.entries(occurrences)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => parseInt(id));

    // Map sorted IDs to products
    let suggestions = sortedIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined && p.id !== product.id && p.stock > 0);

    // If less than 2, fill up with items in the same category
    if (suggestions.length < 2) {
      const sameCategory = products
        .filter(p => p.category === product.category && p.id !== product.id && p.stock > 0 && !suggestions.some(s => s.id === p.id))
        .slice(0, 2 - suggestions.length);
      suggestions = [...suggestions, ...sameCategory];
    }

    // Still less than 2? fill up with any in stock items
    if (suggestions.length < 2) {
      const fallback = products
        .filter(p => p.id !== product.id && p.stock > 0 && !suggestions.some(s => s.id === p.id))
        .slice(0, 2 - suggestions.length);
      suggestions = [...suggestions, ...fallback];
    }

    return suggestions.slice(0, 2);
  }, [product, orders, products]);

  // Track checked suggested item IDs for bundle
  const [checkedSuggestIds, setCheckedSuggestIds] = useState<number[]>([]);

  // Keep suggested items synced and checked when product changes
  useEffect(() => {
    setCheckedSuggestIds(suggestedItems.map(item => item.id));
  }, [product, suggestedItems]);

  if (!isOpen) return null;

  const isWished = wishlist.includes(product.id);
  const discount = calcDiscount(product.price, product.originalPrice);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= settings.lowStockThreshold;

  // Calculate default descriptions and specs if not defined
  const defaultDesc = product.description || `Premium quality ${product.name} sourced from reliable suppliers and certified farms across East Africa. Perfect for your family's daily nutritional needs or household comfort. Prepared under sterile, high-grade hygienic conditions to ensure freshness and longevity. Only at Kipchimatt.`;
  
  const defaultSpecs: Record<string, string> = product.specifications || {
    'Manufacturer / Brand': product.brand || 'Kipchimatt Kenya',
    'Catalog Classification': product.category.toUpperCase(),
    'Stock Availability': product.stock > 0 ? `${product.stock} Units left` : 'Out of Stock',
    'Packaging Standard': 'Sealed Retail Box',
    'Fulfillment Target': 'Express Home Delivery in under 90 Mins',
    'Return Policy': '7-Day Return & Full Refund Guarantee'
  };

  const productReviews = product.reviews || [
    { id: '1', userName: 'Grace Wanjiku', rating: 5, comment: 'Safi sana! Delighted by how fresh it was delivered to Kilimani.', date: new Date(Date.now() - 3600000 * 48).toISOString() },
    { id: '2', userName: 'Emmanuel Kiprono', rating: 4, comment: 'Excellent quality, authentic product. Kipchimatt service is reliable as always.', date: new Date(Date.now() - 3600000 * 96).toISOString() }
  ];

  const averageRating = product.rating || 4.7;
  const totalReviews = productReviews.length;

  const handleQtyChange = (delta: number) => {
    const next = qty + delta;
    if (next > 0 && next <= product.stock) {
      setQty(next);
    }
  };

  const handleAddToCartClick = () => {
    if (qty > 0) {
      onAddToCart(product, qty);
      setQty(1);
      onClose();
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    onAddReview(product.id, {
      userName: reviewName.trim(),
      rating: reviewRating,
      comment: reviewComment.trim()
    });

    setReviewName('');
    setReviewRating(5);
    setReviewComment('');
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 3000);
  };

  // Find 4 related products in same category
  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-fade-in">
      {/* Scrollable Container Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto animate-scale-up relative border border-gray-150 flex flex-col scrollbar-none">
        
        {/* Floating Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 shadow-md flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Close Product Page"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Body Grid */}
        <div className="p-5 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 flex-1">
          
          {/* Column Left: High Definition Image & Quick Badges (md:span-5) */}
          <div className="md:col-span-5 space-y-4">
            <div className="aspect-square w-full rounded-2xl bg-gray-50 border border-gray-150 overflow-hidden relative shadow-sm group">
              <img 
                src={product.image || 'https://via.placeholder.com/450?text=Kipchimatt'} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/450?text=Grocery';
                }}
              />

              {/* Discount Percent */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white font-black text-xs px-3.5 py-1.5 rounded-lg shadow-md uppercase tracking-wider">
                  -{discount}% OFF
                </div>
              )}

              {/* Gated/Age 18+ Label for Liquor */}
              {product.category === 'liquor' && (
                <div className="absolute bottom-4 left-4 bg-amber-600 text-white font-black text-[10px] px-3 py-1 rounded border border-amber-400 uppercase tracking-widest shadow-md">
                  18+ Gated Liquor
                </div>
              )}
            </div>

            {/* Micro-Features Row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                <ShieldCheck className="w-5 h-5 mx-auto text-plum mb-1" />
                <span className="text-[9px] font-black uppercase text-gray-500 block">100% Genuine</span>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                <Truck className="w-5 h-5 mx-auto text-green mb-1" />
                <span className="text-[9px] font-black uppercase text-gray-500 block">Fast Rider</span>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                <RotateCcw className="w-5 h-5 mx-auto text-plum mb-1" />
                <span className="text-[9px] font-black uppercase text-gray-500 block">7-Day Refund</span>
              </div>
            </div>

            {/* Kenya-Centric Delivery Estimator Box */}
            <div className="bg-plum/5 border border-plum/15 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-plum">
                <Truck className="w-4.5 h-4.5" />
                <span>Supermarket Fulfillment Promise</span>
              </div>
              <p className="text-[11px] text-gray-600 font-semibold leading-relaxed">
                Dispatching to <strong className="text-gray-900 underline font-extrabold">{deliveryLocation} County</strong>. Deliveries arrive at your doorstep within <strong>60 to 90 minutes</strong>. Free delivery applies for baskets above Ksh 2,000!
              </p>
            </div>
          </div>

          {/* Column Right: Details, Tab UI & Interactive Actions (md:span-7) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Top Product Header */}
            <div>
              <span className="text-xs text-plum-light font-black uppercase tracking-widest block mb-1">
                {product.brand || 'KIPCHIMATT EXCLUSIVE'}
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-gray-800 leading-tight">
                {product.name}
              </h2>

              {/* Stars & Reviews */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5 text-plum">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star 
                      key={idx} 
                      className={`w-4 h-4 ${idx < Math.round(averageRating) ? 'fill-current' : 'text-gray-250'}`} 
                    />
                  ))}
                </div>
                <span className="text-xs font-extrabold text-gray-700">{averageRating} out of 5</span>
                <span className="text-gray-300 font-normal text-sm">|</span>
                <span className="text-xs font-bold text-plum-light hover:underline cursor-pointer" onClick={() => setActiveTab('reviews')}>
                  {totalReviews} Customer Reviews
                </span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-0.5">Kipchimatt Online Price</span>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-xl sm:text-3xl font-black text-plum">
                    {formatMoney(product.price)}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-xs sm:text-base text-gray-400 line-through">
                      {formatMoney(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              {discount > 0 && (
                <div className="text-right">
                  <span className="bg-green/5 border border-green/15 text-green text-[10px] font-black uppercase px-2.5 py-1 rounded block mb-1">
                    Save {discount}%
                  </span>
                  <span className="text-[11px] text-green font-bold block">
                    Pocket Ksh {product.originalPrice - product.price}
                  </span>
                </div>
              )}
            </div>

            {/* Loyalty Points Display */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-200">
                <Award className="w-5.5 h-5.5 fill-current animate-wiggle" />
              </div>
              <div className="text-xs">
                <span className="text-[9px] bg-amber-600 text-white font-black uppercase px-2 py-0.5 rounded-full tracking-wider inline-block mb-1 shadow-sm">
                  Kipchimatt Loyalty Club
                </span>
                <p className="text-gray-800 font-bold">
                  Buy this item & earn <span className="text-amber-700 font-extrabold text-sm">{Math.floor(product.price / 100) * qty}</span> Loyalty Points!
                </p>
                {customer ? (
                  <p className="text-gray-500 text-[11px] mt-0.5 font-semibold">
                    Welcome back, <strong className="text-gray-800 font-extrabold">{customer.name}</strong> • Your current balance is <strong className="text-plum font-black">{customer.points || 0} pts</strong>.
                  </p>
                ) : (
                  <p className="text-gray-500 text-[11px] mt-0.5 font-semibold">
                    New customer? Enter your details at checkout to save your points.
                  </p>
                )}
              </div>
            </div>

            {/* Quantities & Add to basket Actions bar */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                
                {/* Quantity Control (only show if instock) */}
                {!isOutOfStock && (
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
                    <button 
                      onClick={() => handleQtyChange(-1)}
                      disabled={qty <= 1}
                      className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-250 hover:bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer text-sm font-bold disabled:opacity-50"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs sm:text-sm font-black text-gray-800 w-6 text-center select-none">
                      {qty}
                    </span>
                    <button 
                      onClick={() => handleQtyChange(1)}
                      disabled={qty >= product.stock}
                      className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-250 hover:bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer text-sm font-bold disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Primary CTA Add to Basket */}
                <button 
                  onClick={handleAddToCartClick}
                  disabled={isOutOfStock}
                  className={`flex-1 min-w-[150px] py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${isOutOfStock ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-plum text-white hover:bg-plum-dark hover:shadow-lg'}`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Currently Sold Out' : `Add ${qty} to Basket • ${formatMoney(product.price * qty)}`}</span>
                </button>

                {/* Wishlist Heart */}
                <button 
                  onClick={() => onToggleWishlist(product.id)}
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 transition-transform ${isWished ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-gray-400 hover:text-red-500 border-gray-200'}`}
                  title={isWished ? 'Remove from Saved Wishlist' : 'Add to Saved Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Stock Warning Levels */}
              {isOutOfStock ? (
                <div className="space-y-3">
                  <p className="text-xs text-red-500 font-extrabold bg-red-50 p-2.5 rounded-lg border border-red-100/50 flex items-center gap-1.5 justify-center">
                    <span>⚠️ Out of stock! This product is currently unavailable. Tap heart to save and monitor restock.</span>
                  </p>
                  
                  {/* Notify me when in stock form */}
                  <div className="bg-plum/5 dark:bg-plum/10 border border-plum/15 dark:border-pink-500/20 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-black text-plum dark:text-pink-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-plum dark:text-pink-400" />
                      <span>Notify me when in stock</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                      Enter your email below and we'll ping you the instant this item is restocked!
                    </p>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const emailInput = form.elements.namedItem('restockEmail') as HTMLInputElement;
                        const emailStr = emailInput?.value.trim();
                        if (!emailStr) return;

                        const stored = localStorage.getItem('restockRequests');
                        const requests = stored ? JSON.parse(stored) : [];
                        const duplicate = requests.some((r: any) => r.productId === product.id && r.email.toLowerCase() === emailStr.toLowerCase());
                        
                        if (!duplicate) {
                          requests.push({
                            id: Date.now().toString(),
                            productId: product.id,
                            productName: product.name,
                            email: emailStr,
                            requestedAt: new Date().toISOString()
                          });
                          localStorage.setItem('restockRequests', JSON.stringify(requests));
                        }

                        setRestockSuccess(true);
                        emailInput.value = '';
                        setTimeout(() => setRestockSuccess(false), 4000);
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        type="email"
                        name="restockEmail"
                        required
                        placeholder="your.email@example.com"
                        defaultValue={customer?.email || ''}
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-plum focus:ring-1 focus:ring-plum text-gray-800 dark:text-gray-100"
                      />
                      <button 
                        type="submit"
                        className="bg-plum hover:bg-plum-dark text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Notify Me
                      </button>
                    </form>
                    {restockSuccess && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                        ✓ Restock request saved! We will contact you when restocked.
                      </p>
                    )}
                  </div>
                </div>
              ) : isLowStock ? (
                <p className="text-xs text-amber-600 font-extrabold bg-amber-50 p-2.5 rounded-lg border border-amber-100/50 flex items-center gap-1.5 justify-center animate-pulse">
                  <span>🔥 Hurry! Only {product.stock} units left in supermarket stock aisle.</span>
                </p>
              ) : (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5 justify-center">
                  <span>✓ Standard in-stock. Secure fulfillment is guaranteed.</span>
                </p>
              )}
            </div>

            {/* Tabbed Info Deck */}
            <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
              
              {/* Tab headers */}
              <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-150 text-xs font-extrabold text-gray-500 select-none">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`py-3 text-center border-r border-gray-150 cursor-pointer transition-colors ${activeTab === 'overview' ? 'bg-white text-plum font-black border-b border-b-transparent' : 'hover:bg-gray-100'}`}
                >
                  <span>Overview</span>
                </button>
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={`py-3 text-center border-r border-gray-150 cursor-pointer transition-colors ${activeTab === 'specs' ? 'bg-white text-plum font-black border-b border-b-transparent' : 'hover:bg-gray-100'}`}
                >
                  <span>Specifications</span>
                </button>
                <button 
                  onClick={() => setActiveTab('reviews')}
                  className={`py-3 text-center cursor-pointer transition-colors ${activeTab === 'reviews' ? 'bg-white text-plum font-black border-b border-b-transparent' : 'hover:bg-gray-100'}`}
                >
                  <span>Reviews ({totalReviews})</span>
                </button>
              </div>

              {/* Tab panels */}
              <div className="p-5 flex-1 max-h-[220px] overflow-y-auto text-xs font-medium text-gray-600 leading-relaxed scrollbar-none bg-white">
                
                {/* 1. Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    <p className="whitespace-pre-line text-gray-700">{defaultDesc}</p>
                    <div className="flex gap-2 items-center text-[10px] text-gray-400 font-extrabold uppercase pt-2">
                      <Award className="w-4 h-4 text-plum" />
                      <span>Certified Quality Supermarket Goods</span>
                    </div>
                  </div>
                )}

                {/* 2. Specifications */}
                {activeTab === 'specs' && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody>
                        {Object.entries(defaultSpecs).map(([key, value], idx) => (
                          <tr 
                            key={key} 
                            className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}
                          >
                            <td className="px-4 py-2 font-extrabold text-plum w-1/3 border-r border-gray-100">{key}</td>
                            <td className="px-4 py-2 text-gray-700 font-semibold">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. Reviews */}
                {activeTab === 'reviews' && (
                  <div className="space-y-5">
                    
                    {/* Review List */}
                    <div className="space-y-3">
                      {productReviews.map((rev) => (
                        <div key={rev.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-gray-800 text-xs">{rev.userName}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {new Date(rev.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex gap-0.5 text-plum">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'text-gray-250'}`} />
                            ))}
                          </div>
                          <p className="text-gray-600 text-xs italic">"{rev.comment}"</p>
                        </div>
                      ))}
                    </div>

                    {/* Write a review form */}
                    <form onSubmit={handleReviewSubmit} className="border-t border-gray-100 pt-4 mt-2 space-y-3">
                      <div className="flex items-center gap-1 text-xs font-black text-gray-700 uppercase">
                        <MessageSquare className="w-4 h-4 text-plum" />
                        <span>Write a Customer Review</span>
                      </div>
                      
                      {reviewSuccess && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-bold text-center">
                          ✓ Review published! Thank you for sharing your experience.
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Your Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g., Jane Kemunto"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-plum font-semibold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stars Rating</label>
                          <select 
                            value={reviewRating}
                            onChange={(e) => setReviewRating(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-plum font-bold text-xs bg-white"
                          >
                            <option value={5}>5 Stars - Safi / Excellent</option>
                            <option value={4}>4 Stars - Great / Very Good</option>
                            <option value={3}>3 Stars - Decent / Average</option>
                            <option value={2}>2 Stars - Subpar / Poor</option>
                            <option value={1}>1 Star - Bad / Terrible</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Review Comments</label>
                        <textarea 
                          rows={2}
                          required
                          placeholder="Tell Kenyan shoppers what you think about this grocery standard..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-plum font-medium text-xs"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="bg-plum hover:bg-plum-dark text-white text-[10px] font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
                      >
                        <span>Publish Review</span>
                        <Send className="w-3 h-3" />
                      </button>
                    </form>

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

        {/* Frequently Bought Together Section */}
        {suggestedItems.length > 0 && (
          <div className="border-t border-gray-150 p-5 sm:p-8 bg-amber-50/20 dark:bg-amber-500/5">
            <h3 className="font-black text-gray-800 dark:text-gray-100 text-sm mb-4 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Frequently Bought Together</span>
            </h3>

            <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Visual Plus-Chain of Products */}
                <div className="md:col-span-8 flex flex-wrap items-center gap-4">
                  
                  {/* Item 1: Current Product */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-850 p-3 rounded-xl border border-gray-150 dark:border-gray-800/85 max-w-[240px]">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                      <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                      <span className="absolute bottom-0 right-0 bg-plum text-white text-[8px] px-1 font-bold rounded-tl">This Item</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-800 dark:text-gray-200 text-xs truncate">{product.name}</h4>
                      <p className="text-plum dark:text-pink-400 font-extrabold text-[11px] mt-0.5">{formatMoney(product.price)}</p>
                    </div>
                  </div>

                  {/* Plus Sign */}
                  {suggestedItems.map((item, idx) => {
                    const isChecked = checkedSuggestIds.includes(item.id);
                    return (
                      <React.Fragment key={item.id}>
                        <div className="text-gray-300 dark:text-gray-700 font-bold text-lg select-none">+</div>
                        
                        {/* Suggested Item Card */}
                        <div 
                          onClick={() => {
                            setCheckedSuggestIds(prev => 
                              prev.includes(item.id) 
                                ? prev.filter(id => id !== item.id) 
                                : [...prev, item.id]
                            );
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all max-w-[240px] ${
                            isChecked 
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/50' 
                              : 'bg-gray-50/50 dark:bg-gray-850/30 border-gray-150 dark:border-gray-800/40 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-250 bg-white flex-shrink-0">
                            <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                            {isChecked && (
                              <span className="absolute top-0 left-0 bg-amber-500 text-gray-950 p-0.5 rounded-br">
                                <Check className="w-2.5 h-2.5 font-bold text-gray-950" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">{item.name}</h4>
                            <p className="text-gray-500 dark:text-gray-400 font-extrabold text-[11px] mt-0.5">{formatMoney(item.price)}</p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                </div>

                {/* Bundle Summary & CTA (md:col-span-4) */}
                <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-gray-150 dark:border-gray-800 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-wider block">Bundle pricing</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg sm:text-xl font-black text-orange dark:text-orange-light">
                        {formatMoney(
                          product.price + 
                          suggestedItems
                            .filter(item => checkedSuggestIds.includes(item.id))
                            .reduce((sum, item) => sum + item.price, 0)
                        )}
                      </span>
                      {checkedSuggestIds.length > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold italic">
                          ({checkedSuggestIds.length + 1} items)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Add current item with quantity qty
                      onAddToCart(product, qty);
                      // Add checked suggested items with quantity 1
                      suggestedItems.forEach(item => {
                        if (checkedSuggestIds.includes(item.id)) {
                          onAddToCart(item, 1);
                        }
                      });
                      onClose();
                    }}
                    className="w-full bg-orange hover:bg-orange/85 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>Add Bundle to Basket</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* RELATED PRODUCTS shelf (md:span-12) */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-gray-150 p-5 sm:p-8 bg-gray-50/50">
            <h3 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-plum" />
              <span>Related Customer Favorites</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map(p => {
                const discountVal = calcDiscount(p.price, p.originalPrice);
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      onNavigateToProduct(p);
                      setQty(1);
                    }}
                    className="bg-white rounded-xl border border-gray-150 p-3 hover:border-plum hover:shadow-lg cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative mb-2">
                      <img 
                        src={p.image || 'https://via.placeholder.com/150?text=Item'} 
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Grocery';
                        }}
                      />
                      {discountVal > 0 && (
                        <span className="absolute top-1 left-1 bg-red text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow-sm">
                          -{discountVal}%
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-plum-light font-bold block">{p.brand || 'Kipchimatt'}</span>
                      <h4 className="font-bold text-gray-800 text-[11px] line-clamp-2 leading-tight h-7 mt-0.5 group-hover:text-plum transition-colors">
                        {p.name}
                      </h4>
                    </div>

                    <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-gray-50">
                      <span className="text-xs font-black text-plum">{formatMoney(p.price)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-plum transition-colors group-hover:translate-x-1 duration-200" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
