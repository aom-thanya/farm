import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Transactions from './Transactions';
import { useStore } from '../store/useStore';

describe('Transaction history dates', () => {
  beforeEach(() => {
    useStore.setState({
      dateFilter: { type: 'all' },
      isLoading: false,
      transactions: [{
        id: 'tx-1', type: 'income', amount: 100, category: 'income_1',
        cat_name: 'มะม่วง', cat_emoji: '🥭', quantity: 1, unit_price: 100,
        created_at: '2026-09-16T14:41:16.368Z', date: '2026-09-17'
      }]
    });
  });

  it('groups by the selected transaction date even when creation happened on another day', () => {
    render(<Transactions />);
    expect(screen.getByText('17 ก.ย. 2569')).toBeInTheDocument();
    expect(screen.queryByText('16 ก.ย. 2569')).not.toBeInTheDocument();
  });
});
