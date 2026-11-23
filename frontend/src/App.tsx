import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { CartProvider } from './context/CartContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { PantryDashboard } from './pages/PantryDashboard.js';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-3xl bg-amber-500/20 text-2xl flex items-center justify-center animate-bounce mb-3 shadow-soft-sm">
          🥨
        </div>
        <div className="text-sm font-bold text-stone-700">Loading Snack Overflow...</div>
      </div>
    );
  }

  return isAuthenticated ? <PantryDashboard /> : <LoginPage />;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
