import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { useStore } from '../store/useStore';
import { todayDateInput, transactionFilterRange } from '../lib/utils';
import { categoryApi, transactionApi } from '../api/gasApi';

vi.mock('../api/gasApi', () => ({
  authApi: { logout: vi.fn() },
  categoryApi: { getCategories: vi.fn() },
  transactionApi: { getTransactions: vi.fn() }
}));
vi.mock('./AddTransactionModal', () => ({ default: () => null }));

describe('Layout transaction filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const today = todayDateInput();
    useStore.setState({
      user: { id: 'u1', username: 'admin', token: 'token' },
      dateFilter: { type: 'day', start: today, end: today },
      transactions: [], categories: [], isLoading: false
    });
    transactionApi.getTransactions.mockResolvedValue({ success: true, data: [] });
    categoryApi.getCategories.mockResolvedValue({ success: true, data: [] });
  });

  it('requests today by default, then the selected month and year', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}><Route index element={<div>dashboard</div>} /></Route>
        </Routes>
      </MemoryRouter>
    );

    const today = todayDateInput();
    await waitFor(() => expect(transactionApi.getTransactions).toHaveBeenCalledWith({ startDate: today, endDate: today }));
    expect(screen.getAllByRole('button', { name: /^(วัน|เดือน|ปี)$/ }).map(button => button.textContent))
      .toEqual(['วัน', 'เดือน', 'ปี']);

    fireEvent.change(screen.getByLabelText('วันเริ่มต้น'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('วันสิ้นสุด'), { target: { value: '2026-09-12' } });
    await waitFor(() => expect(transactionApi.getTransactions).toHaveBeenCalledWith({
      startDate: '2026-09-10', endDate: '2026-09-12'
    }));

    fireEvent.click(screen.getByRole('button', { name: 'เดือน' }));
    await waitFor(() => expect(transactionApi.getTransactions).toHaveBeenCalledWith(
      transactionFilterRange({ type: 'month', date: useStore.getState().dateFilter.date })
    ));

    fireEvent.click(screen.getByRole('button', { name: 'ปี' }));
    const year = new Date().getFullYear();
    await waitFor(() => expect(transactionApi.getTransactions).toHaveBeenCalledWith({
      startDate: `${year}-01-01`, endDate: `${year}-12-31`
    }));
  });
});
