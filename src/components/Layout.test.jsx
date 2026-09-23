import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { useStore } from '../store/useStore';
import { todayDateInput, transactionFilterRange } from '../lib/utils';
import { appDataApi } from '../api/gasApi';

vi.mock('../api/gasApi', () => ({
  authApi: { logout: vi.fn() },
  appDataApi: { getData: vi.fn(), invalidate: vi.fn() }
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
    appDataApi.getData.mockResolvedValue({ transactions: [], categories: [] });
  });

  it('does not refetch on focus, visibility, navigation, or selecting the same date', async () => {
    render(<MemoryRouter><Routes><Route path="/" element={<Layout />}>
      <Route index element={<div>dashboard</div>} />
      <Route path="transactions" element={<div>transactions</div>} />
    </Route></Routes></MemoryRouter>);
    await waitFor(() => expect(appDataApi.getData).toHaveBeenCalledTimes(1));
    fireEvent(window, new Event('focus'));
    fireEvent(document, new Event('visibilitychange'));
    fireEvent.click(screen.getAllByText('รายการทั้งหมด')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'วัน' }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    expect(appDataApi.getData).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'รีเฟรชข้อมูล' }));
    await waitFor(() => expect(appDataApi.getData).toHaveBeenCalledTimes(2));
    expect(appDataApi.invalidate).toHaveBeenCalledTimes(1);
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
    await waitFor(() => expect(appDataApi.getData).toHaveBeenCalledWith({ startDate: today, endDate: today }));
    expect(screen.getAllByRole('button', { name: /^(วัน|เดือน|ปี)$/ }).map(button => button.textContent))
      .toEqual(['วัน', 'เดือน', 'ปี']);

    fireEvent.change(screen.getByLabelText('วันเริ่มต้น'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('วันสิ้นสุด'), { target: { value: '2026-09-12' } });
    await waitFor(() => expect(appDataApi.getData).toHaveBeenCalledWith({
      startDate: '2026-09-10', endDate: '2026-09-12'
    }));

    fireEvent.click(screen.getByRole('button', { name: 'เดือน' }));
    await waitFor(() => expect(appDataApi.getData).toHaveBeenCalledWith(
      transactionFilterRange({ type: 'month', date: useStore.getState().dateFilter.date })
    ));

    fireEvent.click(screen.getByRole('button', { name: 'ปี' }));
    const year = new Date().getFullYear();
    await waitFor(() => expect(appDataApi.getData).toHaveBeenCalledWith({
      startDate: `${year}-01-01`, endDate: `${year}-12-31`
    }));
  });
});
