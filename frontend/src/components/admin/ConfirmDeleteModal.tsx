import React, { useState } from 'react';
import { Modal } from '../common/Modal.js';
import { Snack } from '../../types/snack.js';
import { useToast } from '../../context/ToastContext.js';
import { deleteSnack } from '../../api/snacks.js';
import { AlertCircle, Archive, ShieldCheck } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  snack: Snack | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  snack,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!snack) return;

    setLoading(true);
    try {
      await deleteSnack(snack.id);
      showToast(`Archived "${snack.name}" from active pantry 📦`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive snack', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive Pantry Snack"
      subtitle={snack ? `Hide "${snack.name}" from active listings` : undefined}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-950">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1 pt-0.5">
            <p className="font-extrabold text-rose-900 text-sm">
              Remove from public pantry view?
            </p>
            <p className="text-rose-700 leading-relaxed">
              <span className="font-bold">"{snack?.name}"</span> will no longer be visible for browsing, consumption, or voting by team members.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 text-stone-600 text-xs leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-800">Soft Deletion Guarantee:</span> No database records are deleted. All past votes, consumption events, and restocking transactions remain securely archived in PostgreSQL for complete audit integrity.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
          >
            Keep Active
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
          >
            {loading ? (
              <span>Archiving...</span>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Snack</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
