import React from 'react';
import { SnackCategory, StockStatus } from '../../types/snack.js';
import { Search, Plus, X, Cookie, Flame, Coffee, Apple, Sparkles } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: SnackCategory | 'ALL';
  onCategoryChange: (category: SnackCategory | 'ALL') => void;
  status: StockStatus | 'ALL';
  onStatusChange: (status: StockStatus | 'ALL') => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  isAdmin: boolean;
  onAddSnackClick: () => void;
}

const CATEGORIES: Array<{ key: SnackCategory | 'ALL'; label: string; icon: React.ReactNode }> = [
  { key: 'ALL', label: 'All Pantry', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'SWEET', label: 'Sweet Treats', icon: <Cookie className="w-3.5 h-3.5" /> },
  { key: 'SAVOURY', label: 'Savoury Crunch', icon: <Flame className="w-3.5 h-3.5" /> },
  { key: 'DRINK', label: 'Cold Drinks', icon: <Coffee className="w-3.5 h-3.5" /> },
  { key: 'HEALTHY_ISH', label: 'Healthy-ish', icon: <Apple className="w-3.5 h-3.5" /> },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  onReset,
  hasActiveFilters,
  isAdmin,
  onAddSnackClick,
}) => {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-soft space-y-4">
      {/* Top Bar: Search Input, Status Filter, Admin Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search snacks by name..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-stone-200 text-sm text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative w-full sm:w-44">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as StockStatus | 'ALL')}
              className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer appearance-none"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="STOCKED">🟢 In Stock</option>
              <option value="RUNNING_LOW">🟡 Low Stock Alert</option>
              <option value="GONE">⚪ Out of Stock</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
              ▼
            </div>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors shrink-0"
              title="Reset all active filters"
            >
              Reset
            </button>
          )}

          {/* Admin Add Snack Button */}
          {isAdmin && (
            <button
              onClick={onAddSnackClick}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 transition-all shadow-soft-sm shadow-orange-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Snack</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none pt-0.5 border-t border-stone-100">
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-soft-sm'
                  : 'bg-stone-100/70 text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
