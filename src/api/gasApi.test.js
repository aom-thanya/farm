import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { gasApi, transactionApi, categoryApi, appDataApi } from './gasApi';
import { useStore } from '../store/useStore';

describe('Google Apps Script API', () => {
  const range = { startDate: '2026-09-17', endDate: '2026-09-17' };
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    useStore.setState({ user: { token: 'reset-cache' } });
    useStore.setState({ user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const respond = data => ({ ok: true, json: async () => ({ success: true, data }) });

  it('shares simultaneous reads and reuses results for 30 seconds', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    fetch.mockResolvedValue(respond([]));
    await Promise.all([transactionApi.getTransactions(range), transactionApi.getTransactions(range)]);
    await transactionApi.getTransactions(range);
    expect(fetch).toHaveBeenCalledTimes(1);
    now.mockReturnValue(31000);
    await transactionApi.getTransactions(range);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fetches again after a write or session change', async () => {
    fetch.mockResolvedValue(respond([]));
    await categoryApi.getCategories();
    await categoryApi.addCategory({ type: 'income', name: 'Mango' });
    await categoryApi.getCategories();
    expect(fetch).toHaveBeenCalledTimes(3);
    useStore.getState().setUser({ token: 'another-session' });
    await categoryApi.getCategories();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not cache failed reads', async () => {
    fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(respond([]));
    await expect(categoryApi.getCategories()).rejects.toThrow('offline');
    await categoryApi.getCategories();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not repopulate the cache with reads started before a write', async () => {
    let finishRead;
    fetch.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    const oldRead = categoryApi.getCategories();
    fetch.mockResolvedValue(respond([]));
    await categoryApi.addCategory({ type: 'income', name: 'Mango' });
    finishRead(respond([]));
    await oldRead;
    await categoryApi.getCategories();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('loads and normalizes both datasets with a single request', async () => {
    fetch.mockResolvedValue(respond({
      transactions: [{ id: 1, type: 'income', amount: '10', date: range.startDate }],
      categories: [{ id: 2, type: 'income', name: 'Mango', usage_count: '3' }]
    }));
    const result = await appDataApi.getData(range);
    expect(result.transactions[0]).toMatchObject({ id: '1', amount: 10 });
    expect(result.categories[0]).toMatchObject({ id: '2', usage_count: 3 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('action')).toBe('getAppData');
  });

  it('falls back to the old endpoints only for an older deployment', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, error: 'Invalid action' }) })
      .mockResolvedValue(respond([]));
    expect(await appDataApi.getData(range)).toEqual({ transactions: [], categories: [] });
    expect(fetch).toHaveBeenCalledTimes(3);
    await appDataApi.getData(range);
    expect(fetch).toHaveBeenCalledTimes(3);
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
    await transactionApi.getTransactions(range);
    expect(JSON.parse(fetch.mock.calls[0][1].body).token).toBe('session-token');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject(range);
    await categoryApi.addCategory({ type: 'income', name: 'Mango' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ token: 'session-token', name: 'Mango' });
  });

  it('normalizes transaction data returned by Sheets', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [
      { id: 7, type: 'income', amount: '12.5', quantity: '2', date: '2026-09-17' },
      { id: 8, type: 'other', amount: 1 }
    ] }) });
    const result = await transactionApi.getTransactions(range);
    expect(result.data).toMatchObject([{ id: '7', amount: 12.5, quantity: 2 }]);
  });

  it('keeps the selected date when Sheets serializes Bangkok midnight as the previous UTC day', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{
      id: 'tx-1', type: 'income', amount: 100,
      created_at: '2026-09-17T14:41:16.368Z', date: '2026-09-16T17:00:00.000Z'
    }] }) });
    const result = await transactionApi.getTransactions(range);
    expect(result.data[0].date).toBe('2026-09-17');
  });

  it('does not display out-of-range rows if an older deployment returns extra data', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [
      { id: 'today', type: 'income', amount: 100, date: '2026-09-17' },
      { id: 'tomorrow', type: 'income', amount: 100, date: '2026-09-18' }
    ] }) });
    const result = await transactionApi.getTransactions(range);
    expect(result.data.map(row => row.id)).toEqual(['today']);
  });

  it('recovers legacy rows shifted by one column, including custom categories', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{
      id: 'tx-1', created_at: 'income', type: 'custom_income_123', user_id: 25,
      category: 'note', amount: '2026-09-17', note: 'buyer', date: 25,
      buyer_seller: 1, unit_price: 'income', quantity: 'Mango',
      cat_type: '🥭', cat_name: '2026-09-17T00:00:00.000Z'
    }] }) });
    const result = await transactionApi.getTransactions(range);
    expect(result.data[0]).toMatchObject({ type: 'income', category: 'custom_income_123', amount: 25, date: '2026-09-17', cat_name: 'Mango' });
  });
});
