import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { CartItem, MenuItem } from '../lib/types';

interface CartState {
  items: CartItem[];
  isDirty: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: MenuItem }
  | { type: 'UPDATE_QTY'; itemId: number; quantity: number }
  | { type: 'REMOVE_ITEM'; itemId: number }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; items: CartItem[] }
  | { type: 'SET_DIRTY'; dirty: boolean };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, items: action.items };

    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.menuItem.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuItem.id === action.item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
          isDirty: true,
        };
      }
      return {
        ...state,
        items: [...state.items, { menuItem: action.item, quantity: 1 }],
        isDirty: true,
      };
    }

    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.menuItem.id !== action.itemId),
          isDirty: true,
        };
      }
      const updated = state.items.map((i) =>
        i.menuItem.id === action.itemId ? { ...i, quantity: action.quantity } : i
      );
      return { ...state, items: updated, isDirty: true };
    }

    case 'REMOVE_ITEM': {
      return {
        ...state,
        items: state.items.filter((i) => i.menuItem.id !== action.itemId),
        isDirty: true,
      };
    }

    case 'CLEAR':
      return { items: [], isDirty: true };

    case 'SET_DIRTY':
      return { ...state, isDirty: action.dirty };

    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  isDirty: boolean;
  setClean: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = 'solid_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isDirty: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        dispatch({ type: 'LOAD', items: parsed });
      }
    } catch {
      // ignore corrupt cart
    }
  }, []);

  useEffect(() => {
    if (state.isDirty) {
      localStorage.setItem(CART_KEY, JSON.stringify(state.items));
    }
  }, [state.items, state.isDirty]);

  const addItem = useCallback((item: MenuItem) => {
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', itemId, quantity });
  }, []);

  const removeItem = useCallback((itemId: number) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const setClean = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', dirty: false });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const total = state.items.reduce(
    (sum, i) => sum + (i.quantity * (Number(i.menuItem.price) || 0)),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        itemCount,
        total,
        isDirty: state.isDirty,
        setClean,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
