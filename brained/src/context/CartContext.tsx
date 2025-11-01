import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import trackingClient from '../services/trackingClient';

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
    trackingClient.trackCustomEvent('add_to_cart', {
      productId: item.id,
      price: item.price,
      category: item.category,
      quantity: qty,
      page: 'context',
    });
  };

  const removeItem: CartContextValue['removeItem'] = (id) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    trackingClient.trackCustomEvent('remove_from_cart', {
      productId: id,
      price: item?.price,
      category: item?.category,
    });
  };

  const updateQuantity: CartContextValue['updateQuantity'] = (id, quantity) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    trackingClient.trackCustomEvent('update_cart_quantity', { productId: id, quantity });
  };

  const clear = () => {
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
