import React from 'react';
import { SnackOfTheWeekData } from '../../types/snack.js';
import { CategoryBadge, StockStatusBadge } from '../common/Badge.js';
import { Trophy, Heart, Sparkles } from 'lucide-react';

interface SnackOfTheWeekProps {
  data: SnackOfTheWeekData | null;
  loading: boolean;
}

export const SnackOfTheWeek: React.FC<SnackOfTheWeekProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="w-full bg-white rounded-3xl p-6 border border-stone-200/80 shadow-soft animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-36 bg-stone-100 rounded-full" />
            <div className="h-6 w-60 bg-stone-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.snack) {
    return (
      <div className="w-full bg-white/90 rounded-3xl p-6 sm:p-7 border border-amber-200/60 shadow-soft relative overflow-hidden">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 shadow-soft-sm shrink-0">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Weekly Spotlight
              </span>
              <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                Asia/Kolkata Calendar Week
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-800">
              The crown is up for grabs!
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              No votes cast yet this week. Browse the pantry below and heart your favorite treat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { snack, weeklyVoteCount } = data;
  const derivedStatus =
    snack.quantity === 0
      ? 'GONE'
      : snack.quantity <= snack.lowStockThreshold
      ? 'RUNNING_LOW'
      : 'STOCKED';

  return (
    <div className="relative w-full bg-gradient-to-r from-amber-50/90 via-white to-orange-50/60 rounded-3xl p-6 sm:p-7 border border-amber-200/80 shadow-soft overflow-hidden transition-all">
      {/* Decorative ambient subtle circle */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-amber-100/40 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {/* Trophy Badge */}
          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-soft-md shadow-amber-600/20 shrink-0">
            <Trophy className="w-7 h-7 text-white" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/50">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Snack of the Week
              </span>
              <span className="text-[11px] text-stone-400 font-medium">
                Team Favorite
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {snack.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <CategoryBadge category={snack.category} />
              <StockStatusBadge status={derivedStatus} quantity={snack.quantity} />
            </div>
          </div>
        </div>

        {/* Weekly Votes Box */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white/80 border border-amber-200/60 shadow-soft-sm shrink-0">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Weekly Votes
          </span>
          <div className="flex items-center gap-1.5 text-xl sm:text-2xl font-black text-rose-600">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <span>{weeklyVoteCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
