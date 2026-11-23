import React from 'react';
import { SnackCategory, StockStatus } from '../../types/snack.js';
import { Sparkles, Cookie, Flame, Coffee, Apple } from 'lucide-react';

export const CategoryBadge: React.FC<{ category: SnackCategory }> = ({ category }) => {
  const configs: Record<
    SnackCategory,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    SWEET: {
      label: 'Sweet Treat',
      icon: <Cookie className="w-3 h-3 text-rose-500" />,
      bg: 'bg-rose-50/80',
      text: 'text-rose-700',
      border: 'border-rose-200/70',
    },
    SAVOURY: {
      label: 'Savoury Crunch',
      icon: <Flame className="w-3 h-3 text-amber-600" />,
      bg: 'bg-amber-50/80',
      text: 'text-amber-800',
      border: 'border-amber-200/70',
    },
    DRINK: {
      label: 'Cold Drink',
      icon: <Coffee className="w-3 h-3 text-sky-600" />,
      bg: 'bg-sky-50/80',
      text: 'text-sky-800',
      border: 'border-sky-200/70',
    },
    HEALTHY_ISH: {
      label: 'Healthy-ish',
      icon: <Apple className="w-3 h-3 text-emerald-600" />,
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-800',
      border: 'border-emerald-200/70',
    },
  };

  const config = configs[category] || {
    label: category,
    icon: <Sparkles className="w-3 h-3 text-stone-500" />,
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.bg} ${config.text} ${config.border} transition-colors`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

export const StockStatusBadge: React.FC<{ status: StockStatus; quantity: number }> = ({
  status,
  quantity,
}) => {
  if (status === 'GONE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
        All gone
      </span>
    );
  }

  if (status === 'RUNNING_LOW') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Low stock ({quantity} left)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {quantity} in stock
    </span>
  );
};
