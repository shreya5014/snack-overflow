import React from 'react';
import { Pagination as PaginationType } from '../../types/snack.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  const { page, limit, totalCount, totalPages } = pagination;

  if (totalCount === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-1">
      <div className="text-xs text-stone-500 font-medium">
        Showing <span className="font-bold text-stone-800">{start}</span>–<span className="font-bold text-stone-800">{end}</span> of{' '}
        <span className="font-bold text-stone-800">{totalCount}</span> pantry items
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            page <= 1
              ? 'border-stone-200 text-stone-300 cursor-not-allowed bg-stone-50'
              : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50 shadow-soft-sm active:scale-95'
          }`}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-bold text-stone-700 px-3 py-1.5 bg-white border border-stone-200 rounded-xl shadow-soft-sm">
          {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            page >= totalPages
              ? 'border-stone-200 text-stone-300 cursor-not-allowed bg-stone-50'
              : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50 shadow-soft-sm active:scale-95'
          }`}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
