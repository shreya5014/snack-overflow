import React, { useState } from 'react';
import { useCart } from '../../context/CartContext.js';
import { useToast } from '../../context/ToastContext.js';
import { checkoutCart } from '../../api/snacks.js';
import { CategoryBadge } from '../common/Badge.js';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface CartDrawerProps {
  onCheckoutSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckoutSuccess }) => {
  const {
    items,
    totalCount,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isDrawerOpen) return null;

  const handleCheckout = async () => {
    if (items.length === 0) return;

    // Check if any item exceeds current known quantity
    const overstocked = items.find((item) => item.quantity > item.snack.quantity);
    if (overstocked) {
      showToast(
        `"${overstocked.snack.name}" only has ${overstocked.snack.quantity} units available. Please adjust your quantity.`,
        'warning'
      );
      return;
    }

    setLoading(true);
    try {
      const payload = items.map((item) => ({
        snackId: item.snack.id,
        amount: item.quantity,
      }));

      await checkoutCart(payload);
      showToast(
        `🎉 Grabbed ${totalCount} snack${totalCount === 1 ? '' : 's'} successfully! Enjoy!`,
        'success'
      );
      clearCart();
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
      closeDrawer();
    } catch (err: any) {
      showToast(err.message || 'Checkout failed. Stock may have changed.', 'error');
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeDrawer}
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#faf8f5] shadow-2xl flex flex-col justify-between border-l border-stone-200/80">
          {/* Header */}
          <div className="p-6 bg-white border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-stone-900 tracking-tight">Pantry Bag</h2>
                <p className="text-xs text-stone-500 font-medium">
                  {totalCount} item{totalCount === 1 ? '' : 's'} selected for checkout
                </p>
              </div>
            </div>

            <button
              onClick={closeDrawer}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-100/60 border border-amber-200/60 flex items-center justify-center text-amber-700">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-stone-800">Your bag is empty</h3>
                  <p className="text-xs text-stone-500 max-w-xs">
                    Browse the active pantry shelves and add your favorite treats to grab them all at once!
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 transition-all shadow-soft"
                >
                  <span>Explore Pantry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(({ snack, quantity }) => {
                  const isStockExceeded = quantity > snack.quantity;
                  const canIncrease = quantity < snack.quantity;

                  return (
                    <div
                      key={snack.id}
                      className={`p-4 rounded-3xl bg-white border transition-all ${
                        isStockExceeded
                          ? 'border-rose-300 ring-2 ring-rose-500/10'
                          : 'border-stone-200/80 shadow-soft-sm hover:shadow-soft'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="space-y-1">
                          <CategoryBadge category={snack.category} />
                          <h4 className="text-sm font-bold text-stone-900 leading-snug">
                            {snack.name}
                          </h4>
                          <div className="text-[11px] text-stone-400 font-medium">
                            Stock in pantry: <strong className="text-stone-700">{snack.quantity} units</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(snack.id)}
                          className="p-1.5 rounded-xl text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isStockExceeded && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl mb-2.5 border border-rose-200/60">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Quantity exceeds available stock ({snack.quantity})</span>
                        </div>
                      )}

                      {/* Stepper Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <span className="text-xs font-semibold text-stone-500">Quantity</span>
                        <div className="flex items-center gap-2 bg-stone-50 p-1 rounded-2xl border border-stone-200/70">
                          <button
                            onClick={() => updateQuantity(snack.id, quantity - 1)}
                            className="w-7 h-7 rounded-xl bg-white hover:bg-stone-200/80 flex items-center justify-center text-stone-700 font-bold shadow-xs active:scale-95 transition-all"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <span className="w-6 text-center text-xs font-black text-stone-800">
                            {quantity}
                          </span>

                          <button
                            onClick={() => updateQuantity(snack.id, quantity + 1)}
                            disabled={!canIncrease}
                            className="w-7 h-7 rounded-xl bg-white hover:bg-stone-200/80 flex items-center justify-center text-stone-700 font-bold shadow-xs active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canIncrease ? 'Increase quantity' : 'Max stock reached'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer / Checkout Actions */}
          {items.length > 0 && (
            <div className="p-6 bg-white border-t border-stone-200/80 space-y-4">
              {/* Summary Details */}
              <div className="space-y-2 p-4 rounded-2xl bg-cream-50 border border-stone-200/70">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Total Items</span>
                  <span className="font-bold text-stone-900">{totalCount} units</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Snack Overflow Cost</span>
                  <span className="font-extrabold text-emerald-700 uppercase tracking-wider text-[11px] bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                    Free Perk 🎉
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 pt-1 leading-relaxed border-t border-stone-200/60">
                  💡 All selected snacks will be atomically reserved and deducted from pantry stock in a single transaction.
                </div>
              </div>

              {/* Checkout CTA */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={loading}
                  className="px-4 py-3.5 rounded-2xl text-xs font-bold text-stone-600 hover:text-rose-600 hover:bg-stone-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading || totalCount === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 transition-all shadow-md shadow-stone-900/10 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Checking out...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Check Out Bag ({totalCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
