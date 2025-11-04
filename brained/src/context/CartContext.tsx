import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import analyticsManager from '../services/AnalyticsManager';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image?: string;
  category?: string;
  quantity: number;
  // optional variants
  color?: string;
  size?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'cart_items_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue['addItem'] = (item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        const updated = prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + qty } : p));
        return updated;
      }
      return [...prev, { ...item, quantity: qty }];
    });
    analyticsManager.trackCustomEvent('add_to_cart', {
      productId: item.id,
      title: item.title,
      price: item.price,
      category: item.category,
      quantity: qty,
    });
  };

  const removeItem: CartContextValue['removeItem'] = (id) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    analyticsManager.trackCustomEvent('remove_from_cart', {
      productId: id,
      price: item?.price,
      category: item?.category,
      title: item?.title,
    });
  };

  const updateQuantity: CartContextValue['updateQuantity'] = (id, quantity) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    analyticsManager.trackCustomEvent('update_cart_quantity', { 
      productId: id, 
      quantity,
      title: item?.title,
      price: item?.price,
    });
  };

  const clear = () => {
    analyticsManager.trackCustomEvent('clear_cart', {
      itemCount: items.length,
      totalValue: subtotal,
    });
    setItems([]);
  };

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    subtotal,
    totalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
