import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddTransactionModal from './AddTransactionModal';
import { categoryApi, transactionApi } from '../api/gasApi';
import { useStore } from '../store/useStore';

vi.mock('../api/gasApi', () => ({
  categoryApi: { addCategory: vi.fn() },
  transactionApi: { addTransaction: vi.fn(), getTransactions: vi.fn() }
}));

describe('Create category from transaction modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ user: { id: 'u1', token: 'token' }, categories: [], transactions: [] });
  });

  it('updates a saved transaction locally without reading both datasets again', async () => {
    useStore.setState({
      categories: [{ id: 'c1', type: 'income', name: 'Mango', emoji: '🥭', usage_count: 2 }],
      dateFilter: { type: 'day', start: '2000-01-01', end: '2099-12-31' }
    });
    transactionApi.addTransaction.mockResolvedValue({ success: true, data: { id: 'tx-new' } });
    const onClose = vi.fn();
    render(<AddTransactionModal isOpen onClose={onClose} type="income" />);
    fireEvent.click(screen.getByText('Mango'));
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(transactionApi.addTransaction).toHaveBeenCalledTimes(1);
    expect(transactionApi.getTransactions).not.toHaveBeenCalled();
    expect(useStore.getState().transactions).toContainEqual(expect.objectContaining({ id: 'tx-new', amount: 10 }));
    expect(useStore.getState().categories[0].usage_count).toBe(3);
  });

  it.each(['income', 'expense'])('opens a modal and saves a new %s category', async type => {
    categoryApi.addCategory.mockResolvedValue({ success: true, data: { id: 'new-category-id' } });
    render(<AddTransactionModal isOpen onClose={vi.fn()} type={type} />);

    fireEvent.click(screen.getByRole('button', { name: `+ กรอกประเภทราย${type === 'income' ? 'รับ' : 'จ่าย'}ใหม่` }));
    expect(screen.getByText('เพิ่มหมวดหมู่ใหม่')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เลือก Emoji' })).toHaveTextContent('🌟');

    fireEvent.change(screen.getByLabelText('ชื่อหมวดหมู่'), { target: { value: 'มะม่วง' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('เพิ่มหมวดหมู่สำเร็จ'));
    expect(categoryApi.addCategory).toHaveBeenCalledWith({ type, name: 'มะม่วง', emoji: '🌟' });
    expect(useStore.getState().categories).toContainEqual({ id: 'new-category-id', type, name: 'มะม่วง', emoji: '🌟', usage_count: 0 });
    expect(screen.getByText('มะม่วง')).toBeInTheDocument();
  });

  it('keeps the form open when the API rejects the save', async () => {
    categoryApi.addCategory.mockRejectedValue(new Error('Save failed'));
    render(<AddTransactionModal isOpen onClose={vi.fn()} type="income" />);
    fireEvent.click(screen.getByRole('button', { name: '+ กรอกประเภทรายรับใหม่' }));
    fireEvent.change(screen.getByLabelText('ชื่อหมวดหมู่'), { target: { value: 'มะม่วง' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByText('เพิ่มหมวดหมู่ใหม่')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
