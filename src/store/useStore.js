import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { todayDateInput } from '../lib/utils';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      transactions: [],
      categories: [],
      isLoading: false,
      dateFilter: { type: 'day', start: todayDateInput(), end: todayDateInput() },
      
      setDateFilter: (filter) => set({ dateFilter: filter }),
      
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, transactions: [], categories: [] }),
      
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (transaction) => set((state) => ({ 
        transactions: [...state.transactions, transaction] 
      })),
      removeTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(transaction => String(transaction.id) !== String(id))
      })),
      
      setCategories: (categories) => set({ categories }),
      addCategory: (category) => set((state) => ({
        categories: [...state.categories, category]
      })),
      updateCategory: (category) => set((state) => ({
        categories: state.categories.map(currentCategory =>
          String(currentCategory.id) === String(category.id)
            ? { ...currentCategory, ...category }
            : currentCategory
        )
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
