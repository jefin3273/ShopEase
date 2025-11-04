import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import analyticsManager from '../services/AnalyticsManager';
import api from '../services/api';

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
  loading: boolean;
  syncCart: () => Promise<void>;
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
  const [loading, setLoading] = useState(false);

  // Sync cart with backend when user logs in
  const syncCart = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoading(true);

      // Get current items from state
      const currentItems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      // First, sync localStorage items to backend if any exist
      if (currentItems.length > 0) {
        await api.post('/api/cart/sync', { items: currentItems });
      }

      // Then fetch the merged cart from backend
      const response = await api.get('/api/cart');
      if (response.data.success && response.data.cart) {
        const backendItems: CartItem[] = response.data.cart.items.map((item: { productId: string; title: string; price: number; quantity: number; image?: string; category?: string; color?: string; size?: string }) => ({
          id: item.productId,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          category: item.category,
          color: item.color,
          size: item.size,
        }));
        setItems(backendItems);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backendItems));
      }
    } catch (error) {
      console.error('Failed to sync cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cart from backend on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      syncCart();
    }
  }, [syncCart]);

  // Listen for login events to sync cart
  useEffect(() => {
    const handleLogin = () => {
      syncCart();
    };

    const handleLogout = () => {
      // Clear cart items on logout
      setItems([]);
      localStorage.removeItem(STORAGE_KEY);
    };

    window.addEventListener('user-login', handleLogin);
    window.addEventListener('user-logout', handleLogout);
    return () => {
      window.removeEventListener('user-login', handleLogin);
      window.removeEventListener('user-logout', handleLogout);
    };
  }, [syncCart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue['addItem'] = async (item, qty = 1) => {
    const token = localStorage.getItem('token');

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

    // Sync with backend if authenticated
    if (token) {
      try {
        await api.post('/api/cart/add', {
          productId: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          category: item.category,
          quantity: qty,
          color: item.color,
          size: item.size,
        });
      } catch (error) {
        console.error('Failed to add item to backend cart:', error);
      }
    }
  };

  const removeItem: CartContextValue['removeItem'] = async (id) => {
    const token = localStorage.getItem('token');
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));

    analyticsManager.trackCustomEvent('remove_from_cart', {
      productId: id,
      price: item?.price,
      category: item?.category,
      title: item?.title,
    });

    // Sync with backend if authenticated
    if (token) {
      try {
        await api.delete(`/api/cart/remove/${id}`);
      } catch (error) {
        console.error('Failed to remove item from backend cart:', error);
      }
    }
  };

  const updateQuantity: CartContextValue['updateQuantity'] = async (id, quantity) => {
    const token = localStorage.getItem('token');
    const item = items.find((i) => i.id === id);

    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));

    analyticsManager.trackCustomEvent('update_cart_quantity', {
      productId: id,
      quantity,
      title: item?.title,
      price: item?.price,
    });

    // Sync with backend if authenticated
    if (token) {
      try {
        await api.put('/api/cart/update', {
          productId: id,
          quantity,
        });
      } catch (error) {
        console.error('Failed to update cart quantity in backend:', error);
      }
    }
  };

  const clear = async () => {
    const token = localStorage.getItem('token');

    analyticsManager.trackCustomEvent('clear_cart', {
      itemCount: items.length,
      totalValue: subtotal,
    });
    setItems([]);

    // Sync with backend if authenticated
    if (token) {
      try {
        await api.delete('/api/cart/clear');
      } catch (error) {
        console.error('Failed to clear backend cart:', error);
      }
    }
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
    loading,
    syncCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
