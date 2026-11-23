import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.js';
import { Snack } from '../../types/snack.js';
import { useToast } from '../../context/ToastContext.js';
import { restockSnack } from '../../api/snacks.js';
import { PackagePlus, ArrowRight } from 'lucide-react';

interface RestockModalProps {
  isOpen: boolean;
  snack: Snack | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  snack,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setAmount('10');
  }, [isOpen]);

  const parsedAmount = parseInt(amount, 10);
  const currentQuantity = snack?.quantity ?? 0;
  const projectedQuantity =
    isNaN(parsedAmount) || parsedAmount <= 0 ? currentQuantity : currentQuantity + parsedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snack) return;

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Restock amount must be a positive integer greater than zero', 'warning');
      return;
    }

    setLoading(true);
    try {
      await restockSnack(snack.id, parsedAmount);
      showToast(`Added +${parsedAmount} units of "${snack.name}"! 📦`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to restock snack', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restock Pantry Item"
      subtitle={snack ? `Replenishing inventory for "${snack.name}"` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Visual Stock Flow Banner */}
        <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-emerald-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Current Stock
            </span>
            <div className="text-xl font-black text-stone-800">
              {currentQuantity}{' '}
              <span className="text-xs font-semibold text-stone-400">units</span>
            </div>
          </div>

          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 border border-amber-200/60 shadow-xs text-amber-700">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="text-right space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Projected Stock
            </span>
            <div className="text-xl font-black text-emerald-800">
              {projectedQuantity}{' '}
              <span className="text-xs font-semibold text-emerald-600/70">units</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            Units to Add
          </label>
          <div className="relative">
            <PackagePlus className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200/90 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-cream-50/30"
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs font-medium text-stone-400 mr-1">Quick add:</span>
            {[5, 10, 25, 50].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  parsedAmount === preset
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 active:scale-95'
                }`}
              >
                +{preset}
              </button>
            ))}
          </div>

          <p className="text-xs text-stone-500 mt-3 bg-stone-50 border border-stone-200/70 rounded-xl p-2.5 leading-relaxed">
            📝 This restock creates an atomic, transactional log entry in PostgreSQL linked to your administrator identity.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? (
              <span>Restocking...</span>
            ) : (
              <>
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Confirm Restock</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
