import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Snack,
  SnackCategory,
  SnackOfTheWeekData,
  StockStatus,
  Pagination as PaginationType,
} from '../types/snack.js';
import {
  fetchSnacks,
  fetchSnackOfTheWeek,
  consumeSnack,
  voteForSnack,
} from '../api/snacks.js';
import { Navbar } from '../components/common/Navbar.js';
import { SnackOfTheWeek } from '../components/pantry/SnackOfTheWeek.js';
import { FilterBar } from '../components/pantry/FilterBar.js';
import { SnackCard } from '../components/pantry/SnackCard.js';
import { Pagination } from '../components/pantry/Pagination.js';
import { AddSnackModal } from '../components/admin/AddSnackModal.js';
import { EditSnackModal } from '../components/admin/EditSnackModal.js';
import { RestockModal } from '../components/admin/RestockModal.js';
import { ConfirmDeleteModal } from '../components/admin/ConfirmDeleteModal.js';
import { CartDrawer } from '../components/cart/CartDrawer.js';
import { RefreshCw, PackageX, Sparkles, Box } from 'lucide-react';

export const PantryDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id;

  // State
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [snackOfTheWeek, setSnackOfTheWeek] = useState<SnackOfTheWeekData | null>(null);
  const [loadingSnacks, setLoadingSnacks] = useState(true);
  const [loadingSpotlight, setLoadingSpotlight] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<SnackCategory | 'ALL'>('ALL');
  const [status, setStatus] = useState<StockStatus | 'ALL'>('ALL');
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });

  // Track previous userId to reset filters cleanly whenever authenticated user changes
  const prevUserIdRef = React.useRef(userId);
  useEffect(() => {
    if (prevUserIdRef.current && prevUserIdRef.current !== userId) {
      setSearch('');
      setDebouncedSearch('');
      setCategory('ALL');
      setStatus('ALL');
      setPage(1);
    }
    prevUserIdRef.current = userId;
  }, [userId]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSnack, setEditingSnack] = useState<Snack | null>(null);
  const [restockingSnack, setRestockingSnack] = useState<Snack | null>(null);
  const [deletingSnack, setDeletingSnack] = useState<Snack | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Snack of the Week
  const loadSpotlight = useCallback(async () => {
    setLoadingSpotlight(true);
    try {
      const data = await fetchSnackOfTheWeek();
      setSnackOfTheWeek(data);
    } catch {
      // Spotlight fail safe
    } finally {
      setLoadingSpotlight(false);
    }
  }, [userId]);

  // Load Snacks with user identity dependency for hasVoted reactivity
  const loadSnacks = useCallback(async () => {
    setLoadingSnacks(true);
    try {
      const res = await fetchSnacks({
        page,
        limit: 10,
        search: debouncedSearch,
        category,
        status,
      });
      setSnacks(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast(err.message || 'Failed to load snacks', 'error');
    } finally {
      setLoadingSnacks(false);
    }
  }, [page, debouncedSearch, category, status, userId, showToast]);

  useEffect(() => {
    loadSpotlight();
  }, [loadSpotlight]);

  useEffect(() => {
    loadSnacks();
  }, [loadSnacks]);

  // Handle Consume
  const handleConsume = async (id: string, amount: number) => {
    try {
      const result = await consumeSnack(id, amount);
      showToast(`Enjoy your ${result.snack.name}! 😋 (${result.snack.quantity} remaining)`, 'success');
      loadSnacks();
      loadSpotlight();
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_STOCK') {
        showToast('Out of stock! Someone grabbed the last one right before you.', 'error');
      } else {
        showToast(err.message || 'Failed to consume snack', 'error');
      }
      loadSnacks();
    }
  };

  // Handle Vote
  const handleVote = async (id: string) => {
    try {
      await voteForSnack(id);
      showToast('Vote recorded! 💖', 'success');
      loadSnacks();
      loadSpotlight();
    } catch (err: any) {
      if (err.code === 'ALREADY_VOTED') {
        showToast("You've already voted for this snack this cycle.", 'warning');
      } else {
        showToast(err.message || 'Failed to record vote', 'error');
      }
      loadSnacks();
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('ALL');
    setStatus('ALL');
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== '' || category !== 'ALL' || status !== 'ALL';

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col selection:bg-amber-100 selection:text-amber-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Hero / Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 text-xs font-bold mb-2 border border-amber-200/60">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Office Pantry Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Pantry Stock & Voting
            </h1>
            <p className="text-sm font-medium text-stone-500 mt-1">
              Grab a treat, track live inventory, or cast your vote for next week's pantry favorites.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-stone-200/80 shadow-soft-sm text-xs font-bold text-stone-700">
              <Box className="w-4 h-4 text-amber-600" />
              <span>
                <strong className="text-stone-900">{pagination.totalCount}</strong> active snack{pagination.totalCount === 1 ? '' : 's'}
              </span>
            </div>

            <button
              onClick={() => {
                loadSnacks();
                loadSpotlight();
              }}
              disabled={loadingSnacks}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold text-stone-700 hover:text-stone-900 bg-white border border-stone-200/80 hover:bg-stone-50 shadow-soft-sm active:scale-95 transition-all"
              title="Refresh pantry inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loadingSnacks ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Snack of the Week Spotlight */}
        <SnackOfTheWeek data={snackOfTheWeek} loading={loadingSpotlight} />

        {/* Filter & Controls Toolbar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={(cat) => {
            setCategory(cat);
            setPage(1);
          }}
          status={status}
          onStatusChange={(st) => {
            setStatus(st);
            setPage(1);
          }}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          isAdmin={isAdmin}
          onAddSnackClick={() => setIsAddOpen(true)}
        />

        {/* Snacks Grid Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black text-stone-900 tracking-tight">Active Pantry Shelves</h2>
            <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
              {pagination.totalCount} item{pagination.totalCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Snacks Grid */}
        {loadingSnacks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-soft animate-pulse flex flex-col justify-between h-[280px]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-20 h-6 bg-stone-100 rounded-full" />
                    <div className="w-16 h-6 bg-stone-100 rounded-full" />
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="w-4/5 h-6 bg-stone-200/80 rounded-xl" />
                    <div className="w-1/2 h-3.5 bg-stone-100 rounded-md" />
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-stone-100">
                  <div className="w-full h-2 bg-stone-100 rounded-full" />
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-stone-200/80 rounded-2xl" />
                    <div className="w-12 h-10 bg-stone-100 rounded-2xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : snacks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center shadow-soft">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/60 mx-auto flex items-center justify-center text-amber-600 mb-4 shadow-soft-sm">
              <PackageX className="w-8 h-8 text-amber-700" />
            </div>
            <h3 className="text-xl font-black text-stone-800">The pantry is looking a little empty</h3>
            <p className="text-sm font-medium text-stone-500 max-w-md mx-auto mt-1.5 mb-6">
              {hasActiveFilters
                ? 'No snacks match your current filter or search criteria. Try clearing them to see what else is in the pantry.'
                : 'There are currently no active snacks on the shelves. Ask a pantry administrator to add or restock some goodies!'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 transition-all shadow-md shadow-stone-900/10"
              >
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {snacks.map((snack) => (
                <SnackCard
                  key={snack.id}
                  snack={snack}
                  isAdmin={isAdmin}
                  onConsume={handleConsume}
                  onVote={handleVote}
                  onRestockClick={(s) => setRestockingSnack(s)}
                  onEditClick={(s) => setEditingSnack(s)}
                  onDeleteClick={(s) => setDeletingSnack(s)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </main>

      {/* Admin Modals */}
      <AddSnackModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          loadSnacks();
          loadSpotlight();
        }}
      />

      <EditSnackModal
        isOpen={!!editingSnack}
        snack={editingSnack}
        onClose={() => setEditingSnack(null)}
        onSuccess={() => {
          loadSnacks();
          loadSpotlight();
        }}
      />

      <RestockModal
        isOpen={!!restockingSnack}
        snack={restockingSnack}
        onClose={() => setRestockingSnack(null)}
        onSuccess={() => {
          loadSnacks();
          loadSpotlight();
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingSnack}
        snack={deletingSnack}
        onClose={() => setDeletingSnack(null)}
        onSuccess={() => {
          loadSnacks();
          loadSpotlight();
        }}
      />

      {/* Multi-Item Pantry Bag Checkout Drawer */}
      <CartDrawer
        onCheckoutSuccess={() => {
          loadSnacks();
          loadSpotlight();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white/70 py-6 mt-16 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
              🥨
            </span>
            <span className="font-bold text-stone-700">Snack Overflow</span> &copy; 2026 &bull; Concurrency-Safe Office Pantry
          </div>
          <div className="text-stone-400">
            PostgreSQL &bull; Express &bull; React &bull; Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
};
