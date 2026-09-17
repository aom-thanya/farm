import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      user: null,
      transactions: [],
      categories: [],
      isLoading: false,
      dateFilter: { type: 'month', date: new Date() },
    });
  });

  it('has correct initial state', () => {
    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.transactions).toEqual([]);
    expect(state.categories).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.dateFilter.type).toBe('month');
    expect(state.dateFilter.date).toBeInstanceOf(Date);
  });

  it('setUser sets the user', () => {
    useStore.getState().setUser({ id: 'u1', username: 'admin' });
    expect(useStore.getState().user).toEqual({ id: 'u1', username: 'admin' });
  });

  it('logout clears user, transactions, and categories', () => {
    useStore.setState({
      user: { id: 'u1' },
      transactions: [{ id: 1 }],
      categories: [{ id: 1 }]
    });

    useStore.getState().logout();
    const state = useStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.transactions).toEqual([]);
    expect(state.categories).toEqual([]);
  });

  it('addTransaction appends a transaction', () => {
    const tx = { id: 1, amount: 100, type: 'income' };
    useStore.getState().addTransaction(tx);
    expect(useStore.getState().transactions).toContainEqual(tx);
    expect(useStore.getState().transactions.length).toBe(1);
  });

  it('removeTransaction removes the matching transaction', () => {
    useStore.setState({ transactions: [{ id: 'tx-1' }, { id: 'tx-2' }] });
    useStore.getState().removeTransaction('tx-1');
    expect(useStore.getState().transactions).toEqual([{ id: 'tx-2' }]);
  });

  it('setLoading updates loading state', () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().isLoading).toBe(true);
    
    useStore.getState().setLoading(false);
    expect(useStore.getState().isLoading).toBe(false);
  });

  it('setDateFilter updates the filter correctly', () => {
    useStore.getState().setDateFilter({ type: 'all' });
    expect(useStore.getState().dateFilter).toEqual({ type: 'all' });
  });
});
