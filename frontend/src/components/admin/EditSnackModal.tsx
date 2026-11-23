import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.js';
import { Snack, SnackCategory, UpdateSnackPayload } from '../../types/snack.js';
import { useToast } from '../../context/ToastContext.js';
import { updateSnack } from '../../api/snacks.js';
import { Tag, BellRing, Check } from 'lucide-react';

interface EditSnackModalProps {
  isOpen: boolean;
  snack: Snack | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSnackModal: React.FC<EditSnackModalProps> = ({
  isOpen,
  snack,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SnackCategory>('SWEET');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (snack) {
      setName(snack.name);
      setCategory(snack.category);
      setLowStockThreshold(snack.lowStockThreshold.toString());
    }
  }, [snack]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snack) return;

    if (!name.trim()) {
      showToast('Snack name cannot be empty', 'warning');
      return;
    }

    const parsedThreshold = parseInt(lowStockThreshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold <= 0) {
      showToast('Low stock threshold must be a positive integer', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload: UpdateSnackPayload = {
        name: name.trim(),
        category,
        lowStockThreshold: parsedThreshold,
      };
      await updateSnack(snack.id, payload);
      showToast(`Updated "${name.trim()}" successfully! ✨`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update snack', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Pantry Item"
      subtitle={snack ? `Update details for "${snack.name}"` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            Snack Name
          </label>
          <div className="relative">
            <Tag className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Artisanal Salted Pretzel Bites"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200/90 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-cream-50/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            Pantry Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SnackCategory)}
            className="w-full px-4 py-3 rounded-2xl border border-stone-200/90 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white cursor-pointer transition-all"
          >
            <option value="SWEET">🍬 Sweet Delights</option>
            <option value="SAVOURY">🥨 Savoury & Salty</option>
            <option value="DRINK">🥤 Beverages & Cold Drinks</option>
            <option value="HEALTHY_ISH">🥗 Healthy-ish Bites</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Low-Stock Alert Level
            </label>
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
              Triggers warning badge
            </span>
          </div>
          <div className="relative">
            <BellRing className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="number"
              min="1"
              required
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200/90 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-cream-50/30"
            />
          </div>
          <p className="text-xs text-stone-500 mt-2 bg-stone-50 border border-stone-200/70 rounded-xl p-2.5 leading-relaxed">
            💡 <strong className="text-stone-700">Audit notice:</strong> Current stock levels are modified via <em>Restock</em> or <em>Grab one</em> actions to ensure an immutable transactional ledger in PostgreSQL.
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 transition-all shadow-md shadow-stone-900/10 disabled:opacity-50"
          >
            {loading ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
