'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface LocalCartItem {
  id: string;
  serviceId: string;
  studentId?: string;
  selectedSlots?: Array<{ date: string; startTime: string; endTime: string }>;
  notes?: string;
  teachingAddress?: string;
  addedAt: string;
}

interface CartContextType {
  isHydrated: boolean;
  cartItems: LocalCartItem[];
  addToCartSync: (item: Omit<LocalCartItem, 'id' | 'addedAt'>) => void;
  clearCartSync: () => void;
  syncWithBackend: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'belajarku_cart_items';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [cartItems, setCartItems] = useState<LocalCartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initial mount: Hydrate from localStorage without overwriting
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cart from localStorage:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Listen to custom window event 'cart-updated' across tabs and components
  useEffect(() => {
    const handleCartUpdated = () => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } catch (e) {
        console.warn('Error syncing cart on cart-updated event:', e);
      }
    };

    window.addEventListener('cart-updated', handleCartUpdated);
    window.addEventListener('storage', handleCartUpdated);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated);
      window.removeEventListener('storage', handleCartUpdated);
    };
  }, [queryClient]);

  // Synchronous add-to-cart helper
  const addToCartSync = (item: Omit<LocalCartItem, 'id' | 'addedAt'>) => {
    try {
      // Synchronously read current items from localStorage to prevent race conditions
      let currentItems: LocalCartItem[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) currentItems = JSON.parse(raw) || [];
      } catch {
        currentItems = cartItems;
      }

      const newItem: LocalCartItem = {
        ...item,
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        addedAt: new Date().toISOString(),
      };

      const updated = [newItem, ...currentItems];

      // Write synchronously to localStorage BEFORE updating React state or navigating
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      setCartItems(updated);

      // Invalidate React Query cache & dispatch global event
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    } catch (err) {
      console.error('Failed to sync item to localStorage:', err);
    }
  };

  const clearCartSync = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCartItems([]);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    } catch (err) {
      console.error('Failed to clear cart in localStorage:', err);
    }
  };

  const syncWithBackend = async () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  return (
    <CartContext.Provider
      value={{
        isHydrated,
        cartItems,
        addToCartSync,
        clearCartSync,
        syncWithBackend,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
