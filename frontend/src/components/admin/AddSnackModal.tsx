import React, { useState } from 'react';
import { Modal } from '../common/Modal.js';
import { CreateSnackPayload, SnackCategory } from '../../types/snack.js';
import { useToast } from '../../context/ToastContext.js';
import { createSnack } from '../../api/snacks.js';
import { Plus, Cookie } from 'lucide-react';

interface AddSnackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSnackModal: React.FC<AddSnackModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SnackCategory>('SWEET');
  const [quantity, setQuantity] = useState('12');
  const [lowStockThreshold, setLowStockThreshold] = useState('4');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please provide a snack name', 'warning');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    const parsedThreshold = parseInt(lowStockThreshold, 10);

    if (isNaN(parsedQty) || parsedQty < 0) {
      showToast('Initial quantity must be a positive integer or zero', 'warning');
      return;
    }

    if (isNaN(parsedThreshold) || parsedThreshold <= 0) {
      showToast('Low-stock threshold must be a positive integer greater than zero', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateSnackPayload = {
        name: name.trim(),
        category,
        quantity: parsedQty,
        lowStockThreshold: parsedThreshold,
      };
      await createSnack(payload);
      showToast(`Added "${name.trim()}" to the team pantry! 🎉`, 'success');
      setName('');
      setCategory('SWEET');
      setQuantity('12');
      setLowStockThreshold('4');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create snack', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Pantry Snack"
      subtitle="Stock the team shelves with delicious new treats"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name input */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Snack Name
          </label>
          <div className="relative">
            <Cookie className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dark Chocolate Pistachio Bark"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 text-sm text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SnackCategory)}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-800 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
          >
            <option value="SWEET">🍬 Sweet Treats</option>
            <option value="SAVOURY">🥨 Savoury Crunch</option>
            <option value="DRINK">🥤 Cold Drinks</option>
            <option value="HEALTHY_ISH">🥗 Healthy-ish</option>
          </select>
        </div>

        {/* Quantity & Threshold */}
        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Initial Quantity
            </label>
            <input
              type="number"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <p className="text-[11px] text-stone-400 mt-1">Units initially placed</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Low-Stock Alert
            </label>
            <input
              type="number"
              min="1"
              required
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <p className="text-[11px] text-stone-400 mt-1">Alerts team when ≤ this count</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 transition-all shadow-soft-sm shadow-orange-600/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Adding to pantry...' : 'Add to Pantry'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
