import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { gasApi, transactionApi, categoryApi } from './gasApi';
import { useStore } from '../store/useStore';

describe('Google Apps Script API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    useStore.setState({ user: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends actions and parses successful responses', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: 'tx-1' } }) });
    const result = await gasApi.post('addTransaction', { amount: 10 });
    expect(result.data.id).toBe('tx-1');
    const [url, options] = fetch.mock.calls[0];
    expect(new URL(url).searchParams.get('action')).toBe('addTransaction');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ amount: 10 });
  });

  it('rejects an application error returned with HTTP 200', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: false, error: 'Category not found' }) });
    await expect(categoryApi.deleteCategory('missing')).rejects.toThrow('Category not found');
  });

  it('sends the session token on reads and writes', async () => {
    useStore.setState({ user: { id: 'u1', token: 'session-token' } });
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });
    await transactionApi.getTransactions();
    expect(JSON.parse(fetch.mock.calls[0][1].body).token).toBe('session-token');
    await categoryApi.addCategory({ type: 'income', name: 'Mango' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ token: 'session-token', name: 'Mango' });
  });

  it('normalizes transaction data returned by Sheets', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [
      { id: 7, type: 'income', amount: '12.5', quantity: '2', date: '2026-09-17' },
      { id: 8, type: 'other', amount: 1 }
    ] }) });
    const result = await transactionApi.getTransactions();
    expect(result.data).toMatchObject([{ id: '7', amount: 12.5, quantity: 2 }]);
  });

  it('recovers legacy rows shifted by one column, including custom categories', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{
      id: 'tx-1', created_at: 'income', type: 'custom_income_123', user_id: 25,
      category: 'note', amount: '2026-09-17', note: 'buyer', date: 25,
      buyer_seller: 1, unit_price: 'income', quantity: 'Mango',
      cat_type: '🥭', cat_name: '2026-09-17T00:00:00.000Z'
    }] }) });
    const result = await transactionApi.getTransactions();
    expect(result.data[0]).toMatchObject({ type: 'income', category: 'custom_income_123', amount: 25, date: '2026-09-17', cat_name: 'Mango' });
  });
});
