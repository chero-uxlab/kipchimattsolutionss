import React from 'react';
import { X, ShoppingCart, Star, Check } from 'lucide-react';
import { Product } from '../types';
import { formatMoney } from '../data/catalog';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemove: (id: number) => void;
  onAddToCart: (p: Product) => void;
  addedProductId: number | null;
}

export default function CompareModal({
  isOpen,
  onClose,
  products,
  onRemove,
  onAddToCart,
  addedProductId
}: CompareModalProps) {
  if (!isOpen) return null;

  // Gather all unique specification keys from all compared products
  const specKeys = Array.from(
    new Set(
      products.flatMap(p => p.specifications ? Object.keys(p.specifications) : [])
    )
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-150 dark:border-gray-850 flex flex-col">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-850 flex justify-between items-center bg-plum/5 dark:bg-plum/10">
          <div>
            <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight flex items-center gap-2">
              <span>Product Spec Comparison</span>
              <span className="text-xs bg-plum text-white font-extrabold px-2 py-0.5 rounded-full">
                {products.length} / 3 Items
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">Evaluate and compare specifications, sizing, and pricing side-by-side</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6 overflow-x-auto">
          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400 font-bold">
              No products selected for comparison. Please close and select up to 3 items.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-[10px] font-black uppercase text-gray-400 tracking-wider w-1/4">
                    Product Details
                  </th>
                  {products.map(p => (
                    <th 
                      key={p.id} 
                      className="p-3 border-b border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-950 text-center relative group w-1/4 min-w-[180px]"
                    >
                      <button 
                        onClick={() => onRemove(p.id)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-[10px]"
                        title="Remove from comparison"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <div className="flex flex-col items-center space-y-2 mt-2">
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-20 h-20 object-cover rounded-lg border border-gray-100 dark:border-gray-800"
                        />
                        <div className="text-center space-y-1">
                          <span className="text-[9px] text-plum dark:text-pink-400 font-black uppercase tracking-wider block">
                            {p.brand}
                          </span>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-100 block line-clamp-2 h-8 leading-tight">
                            {p.name}
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                {/* Price Row */}
                <tr className="border-b border-gray-100 dark:border-gray-850">
                  <td className="p-3 bg-gray-50/50 dark:bg-gray-900/40 font-bold text-gray-600 dark:text-gray-400">Retail Price</td>
                  {products.map(p => (
                    <td key={p.id} className="p-3 text-center">
                      <span className="text-sm font-black text-plum dark:text-pink-400">{formatMoney(p.price)}</span>
                      {p.originalPrice > p.price && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through block mt-0.5">
                          {formatMoney(p.originalPrice)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Rating Row */}
                <tr className="border-b border-gray-100 dark:border-gray-850">
                  <td className="p-3 bg-gray-50/50 dark:bg-gray-900/40 font-bold text-gray-600 dark:text-gray-400">Rating</td>
                  {products.map(p => (
                    <td key={p.id} className="p-3 text-center">
                      {p.rating ? (
                        <div className="inline-flex items-center gap-1 bg-plum/10 px-2 py-0.5 rounded text-plum font-bold">
                          <Star className="w-3 h-3 fill-current text-plum" />
                          <span>{p.rating}</span>
                          {p.ratingCount !== undefined && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">({p.ratingCount})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Category Row */}
                <tr className="border-b border-gray-100 dark:border-gray-850">
                  <td className="p-3 bg-gray-50/50 dark:bg-gray-900/40 font-bold text-gray-600 dark:text-gray-400">Category</td>
                  {products.map(p => (
                    <td key={p.id} className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {p.category}
                    </td>
                  ))}
                </tr>

                {/* Stock Level */}
                <tr className="border-b border-gray-100 dark:border-gray-850">
                  <td className="p-3 bg-gray-50/50 dark:bg-gray-900/40 font-bold text-gray-600 dark:text-gray-400">Availability</td>
                  {products.map(p => {
                    const isOutOfStock = p.stock <= 0;
                    return (
                      <td key={p.id} className="p-3 text-center">
                        {isOutOfStock ? (
                          <span className="text-red-600 font-bold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded text-[10px]">Sold Out</span>
                        ) : (
                          <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded text-[10px]">{p.stock} in stock</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Dynamic Spec Rows */}
                {specKeys.map(key => (
                  <tr key={key} className="border-b border-gray-100 dark:border-gray-850">
                    <td className="p-3 bg-gray-50/50 dark:bg-gray-900/40 font-bold text-gray-600 dark:text-gray-400">{key}</td>
                    {products.map(p => (
                      <td key={p.id} className="p-3 text-center font-medium text-gray-800 dark:text-gray-200">
                        {p.specifications?.[key] || <span className="text-gray-300 dark:text-gray-750">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Action Row */}
                <tr>
                  <td className="p-3 bg-gray-50/50 dark:bg-gray-900/40 font-bold text-gray-600 dark:text-gray-400">Action</td>
                  {products.map(p => {
                    const isOutOfStock = p.stock <= 0;
                    return (
                      <td key={p.id} className="p-3 text-center">
                        <button 
                          onClick={() => onAddToCart(p)}
                          disabled={isOutOfStock}
                          className={`w-full max-w-[150px] mx-auto py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : addedProductId === p.id ? 'bg-green text-white' : 'bg-plum text-white hover:bg-plum-dark'}`}
                        >
                          {addedProductId === p.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3" />
                              <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
