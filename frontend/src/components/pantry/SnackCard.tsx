import React, { useState } from 'react';
import { Snack } from '../../types/snack.js';
import { CategoryBadge, StockStatusBadge } from '../common/Badge.js';
import { useCart } from '../../context/CartContext.js';
import { Heart, Cookie, PlusCircle, Pencil, Archive, AlertTriangle, Check, ShoppingBag } from 'lucide-react';

interface SnackCardProps {
  snack: Snack;
  isAdmin: boolean;
  onConsume: (id: string, amount: number) => Promise<void>;
  onVote: (id: string) => Promise<void>;
  onRestockClick: (snack: Snack) => void;
  onEditClick: (snack: Snack) => void;
  onDeleteClick: (snack: Snack) => void;
}

export const SnackCard: React.FC<SnackCardProps> = ({
  snack,
  isAdmin,
  onConsume,
  onVote,
  onRestockClick,
  onEditClick,
  onDeleteClick,
}) => {
  const [consuming, setConsuming] = useState(false);
  const [voting, setVoting] = useState(false);
  const { addToCart, getCartQuantity } = useCart();
  const cartQty = getCartQuantity(snack.id);

  const handleConsume = async () => {
    if (snack.quantity <= 0 || consuming) return;
    setConsuming(true);
    try {
      await onConsume(snack.id, 1);
    } finally {
      setConsuming(false);
    }
  };

  const handleVote = async () => {
    if (snack.hasVoted || voting) return;
    setVoting(true);
    try {
      await onVote(snack.id);
    } finally {
      setVoting(false);
    }
  };

  const isOutOfStock = snack.quantity === 0;
  const isRunningLow = snack.quantity > 0 && snack.quantity <= snack.lowStockThreshold;

  // Stock gauge calculation: healthy target is 2x the low-stock threshold (min 10)
  const targetCapacity = Math.max(snack.lowStockThreshold * 2, 10);
  const stockPercentage = Math.min(Math.round((snack.quantity / targetCapacity) * 100), 100);

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-soft hover:shadow-soft-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Product Content Header */}
      <div className="p-5 sm:p-6 pb-4">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <CategoryBadge category={snack.category} />
          <StockStatusBadge status={snack.derivedStatus} quantity={snack.quantity} />
        </div>

        {/* Snack Title */}
        <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
          {snack.name}
        </h3>

        {/* Stock Level Description */}
        <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
          <span>
            {isOutOfStock ? (
              <span className="text-stone-400 font-medium">None left in pantry</span>
            ) : isRunningLow ? (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Only {snack.quantity} remaining
              </span>
            ) : (
              <span className="text-stone-600 font-medium">{snack.quantity} available</span>
            )}
          </span>
          <span className="text-[11px] text-stone-400">Alert at ≤{snack.lowStockThreshold}</span>
        </div>

        {/* Intuitive Stock Gauge */}
        <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOutOfStock
                ? 'bg-stone-300 w-0'
                : isRunningLow
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: isOutOfStock ? '0%' : `${Math.max(stockPercentage, 12)}%` }}
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 bg-stone-50/40 flex flex-col gap-3">
        {/* Primary Member Actions */}
        <div className="flex items-center gap-1.5">
          {/* Consume Button: "Grab 1" */}
          <button
            onClick={handleConsume}
            disabled={isOutOfStock || consuming}
            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              isOutOfStock
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                : 'bg-stone-900 hover:bg-stone-800 text-white active:scale-98 shadow-soft-sm hover:shadow-soft'
            }`}
            title="Grab 1 immediately"
          >
            <Cookie className={`w-3.5 h-3.5 ${consuming ? 'animate-spin' : ''}`} />
            <span>{consuming ? 'Grabbing...' : isOutOfStock ? 'All gone' : 'Grab 1'}</span>
          </button>

          {/* Multi-Item Bag Button */}
          <button
            onClick={() => addToCart(snack, 1)}
            disabled={isOutOfStock || cartQty >= snack.quantity}
            className={`inline-flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
              isOutOfStock
                ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                : cartQty > 0
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-soft-sm active:scale-95'
                : 'bg-white hover:bg-amber-50/70 text-stone-700 hover:text-amber-900 border-stone-200 hover:border-amber-200 shadow-soft-sm active:scale-95'
            }`}
            title={
              cartQty > 0
                ? `${cartQty} in bag. Click to add 1 more.`
                : 'Add to bag for multi-item checkout'
            }
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
            <span>{cartQty > 0 ? `+Bag (${cartQty})` : '+Bag'}</span>
          </button>

          {/* Heart / Vote Button */}
          <button
            onClick={handleVote}
            disabled={snack.hasVoted || voting}
            title={snack.hasVoted ? "You've already voted for this snack" : 'Vote for this snack as team favorite'}
            className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
              snack.hasVoted
                ? 'bg-rose-50/90 border-rose-200 text-rose-700 cursor-default'
                : 'bg-white hover:bg-rose-50/50 border-stone-200 hover:border-rose-200 text-stone-700 hover:text-rose-600 active:scale-98 shadow-soft-sm'
            }`}
          >
            {snack.hasVoted ? (
              <>
                <Check className="w-3.5 h-3.5 text-rose-600" />
                <span>{snack.voteCount}</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-600">Voted</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-500" />
                <span>{snack.voteCount}</span>
              </>
            )}
          </button>
        </div>

        {/* Admin Controls Toolbar (Visible only if Admin) */}
        {isAdmin && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">
              Admin
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRestockClick(snack)}
                title="Restock units"
                className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-100/70 rounded-xl transition-colors"
                aria-label={`Restock ${snack.name}`}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEditClick(snack)}
                title="Edit snack details"
                className="p-1.5 text-stone-500 hover:text-blue-800 hover:bg-blue-100/70 rounded-xl transition-colors"
                aria-label={`Edit ${snack.name}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteClick(snack)}
                title="Archive snack"
                className="p-1.5 text-stone-500 hover:text-rose-800 hover:bg-rose-100/70 rounded-xl transition-colors"
                aria-label={`Archive ${snack.name}`}
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
