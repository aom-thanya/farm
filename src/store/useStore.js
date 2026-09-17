import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      transactions: [],
      categories: [],
      isLoading: false,
      dateFilter: { type: 'month', date: new Date() },
      
      setDateFilter: (filter) => set({ dateFilter: filter }),
      
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, transactions: [], categories: [] }),
      
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (transaction) => set((state) => ({ 
        transactions: [...state.transactions, transaction] 
      })),
      
      setCategories: (categories) => set({ categories }),
      addCategory: (category) => set((state) => ({
        categories: [...state.categories, category]
      })),
      removeCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
      })),
      
      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: 'farm-money-storage',
      // We only want to persist the user session in localStorage
      partialize: (state) => ({ user: state.user }),
    }
  )
);
