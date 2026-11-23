import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { useCart } from '../../context/CartContext.js';
import { LogOut, ShieldCheck, User as UserIcon, ArrowLeftRight, ShoppingBag } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, quickDemoLogin, logout } = useAuth();
  const { showToast } = useToast();
  const { totalCount, openDrawer } = useCart();

  const handleRoleSwitch = async () => {
    try {
      if (isAdmin) {
        await quickDemoLogin('MEMBER');
        showToast('Switched to Demo Member — you can now vote & grab snacks!', 'info');
      } else {
        await quickDemoLogin('ADMIN');
        showToast('Switched to Demo Admin — pantry management tools unlocked', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to switch role', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-soft shadow-amber-600/20 text-white select-none">
              🥨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-stone-900">
                  Snack<span className="text-orange-600">Overflow</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                  Office Pantry
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block -mt-0.5">
                Fresh fuel for the team
              </p>
            </div>
          </div>

          {/* User Section & Account Switcher */}
          {user && (
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Quick Demo Switcher Pill */}
              <button
                onClick={handleRoleSwitch}
                title={`Switch from ${user.role} to ${isAdmin ? 'MEMBER' : 'ADMIN'}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100/90 hover:bg-stone-200/80 text-stone-700 border border-stone-200/80 transition-all shadow-soft-sm active:scale-95"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Switch to</span>
                <span className="font-bold text-stone-900">{isAdmin ? 'Member' : 'Admin'}</span>
              </button>

              {/* Multi-Item Pantry Bag / Cart Button */}
              <button
                onClick={openDrawer}
                className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 transition-all active:scale-95 shadow-soft-sm"
                title="View Pantry Bag & Checkout"
              >
                <ShoppingBag className="w-4 h-4 text-amber-700" />
                <span className="hidden sm:inline">Bag</span>
                {totalCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 min-w-[18px] h-[18px] text-[10px] font-black text-white bg-amber-600 rounded-full shadow-xs">
                    {totalCount}
                  </span>
                )}
              </button>

              {/* User Profile Capsule */}
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs select-none">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-stone-800 leading-tight">{user.name}</div>
                  <div className="text-[10px] font-medium text-stone-400">{user.email}</div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-3 h-3 text-purple-600" /> : <UserIcon className="w-3 h-3 text-amber-600" />}
                  {user.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Sign out"
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors ml-0.5"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
