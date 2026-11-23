import React, { createContext, useContext, useState, useEffect } from 'react';
import { Snack } from '../types/snack.js';
import { CartItem } from '../types/cart.js';
import { useToast } from './ToastContext.js';

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  uniqueCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addToCart: (snack: Snack, quantity?: number) => void;
  updateQuantity: (snackId: string, quantity: number) => void;
  removeFromCart: (snackId: string) => void;
  clearCart: () => void;
  getCartQuantity: (snackId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'snack_overflow_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCount = items.length;

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const getCartQuantity = (snackId: string): number => {
    const found = items.find((item) => item.snack.id === snackId);
    return found ? found.quantity : 0;
  };

  const addToCart = (snack: Snack, quantityToAdd = 1) => {
    if (snack.quantity <= 0) {
      showToast(`"${snack.name}" is currently out of stock.`, 'warning');
      return;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.snack.id === snack.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const newQty = currentQty + quantityToAdd;
        if (newQty > snack.quantity) {
          showToast(`Only ${snack.quantity} units available for "${snack.name}".`, 'warning');
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty, snack };
        return updated;
      } else {
        if (quantityToAdd > snack.quantity) {
          showToast(`Only ${snack.quantity} units available for "${snack.name}".`, 'warning');
          return prev;
        }
        return [...prev, { snack, quantity: quantityToAdd }];
      }
    });

    showToast(`Added ${snack.name} to your pantry bag 🛍️`, 'info');
  };

  const updateQuantity = (snackId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(snackId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.snack.id === snackId) {
          if (newQuantity > item.snack.quantity) {
            showToast(`Max available stock for "${item.snack.name}" is ${item.snack.quantity}.`, 'warning');
            return { ...item, quantity: item.snack.quantity };
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (snackId: string) => {
    setItems((prev) => prev.filter((item) => item.snack.id !== snackId));
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        uniqueCount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
