import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Seat } from '../types';

export interface Movie {
  id: string | number;
  title: string;
  poster: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  genres?: string[];
  ageRating?: string;
  duration?: number;
  releaseDate?: string;
  director?: string;
  cast?: string[];
}

export interface Session {
  id: string | number;
  movieId: string | number;
  date: string;
  time: string;
  format: string;
  hallId: string | number;
  price: number;
}

export interface CartItem {
  id: string;
  movie: Movie;
  session: Session;
  seats: Seat[];
  totalPrice: number;
  purchaseDate: string;
}

interface CartState {
  items: CartItem[];
  history: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'purchaseDate'>) => void;
  removeItem: (id: string) => void;
  completePurchase: () => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      history: [],
      addItem: (item) => {
        const newItem: CartItem = {
          ...item,
          id: Date.now().toString(),
          purchaseDate: new Date().toISOString(),
        };
        set((state) => ({ items: [...state.items, newItem] }));
      },
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      completePurchase: () =>
        set((state) => ({
          history: [...state.history, ...state.items],
          items: [],
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cinema-cart',
    }
  )
);