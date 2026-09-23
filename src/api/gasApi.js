// API Layer for Google Apps Script
// Users need to replace this URL with their own deployed Apps Script Web App URL
import { useStore } from '../store/useStore';
import { transactionDateKey } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL;
const getToken = () => useStore.getState().user?.token;

const parseResponse = async (response, token) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (!result || typeof result.success !== 'boolean') {
    throw new Error('Invalid API response');
  }
  if (!result.success) {
    if (result.error === 'UNAUTHORIZED' && token === getToken()) useStore.getState().logout();
    throw new Error(result.error || 'API request failed');
  }
  return result;
};

const normalizeTransaction = (transaction) => {
  const isLegacyShiftedRow = ['income', 'expense'].includes(String(transaction.created_at).trim().toLowerCase())
    && typeof transaction.amount === 'string'
    && typeof transaction.date === 'number';

  const normalized = isLegacyShiftedRow
    ? {
        ...transaction,
        created_at: transaction.cat_name,
        type: transaction.created_at,
        category: transaction.type,
        amount: transaction.user_id,
        note: transaction.category,
        date: transaction.amount,
        buyer_seller: transaction.note,
        unit_price: transaction.date,
        quantity: transaction.buyer_seller,
        cat_type: transaction.unit_price,
        cat_name: transaction.quantity,
        cat_emoji: transaction.cat_type
      }
    : transaction;

  return {
    ...normalized,
    id: String(normalized.id),
    type: String(normalized.type).trim().toLowerCase(),
    amount: Number(normalized.amount) || 0,
    unit_price: Number(normalized.unit_price) || 0,
    quantity: Number(normalized.quantity) || 1,
    date: transactionDateKey(normalized.date)
  };
};

const normalizeCategory = (category) => ({
  ...category,
  id: String(category.id || ''),
  type: String(category.type ?? category.cat_type ?? '').trim().toLowerCase(),
  name: String(category.name ?? category.cat_name ?? '').trim(),
  emoji: String(category.emoji ?? category.cat_emoji ?? '').trim(),
  usage_count: Number(category.usage_count) || 0
});

// Memory-only, bounded cache. Never share data between login sessions.
const reads = new Map();
const READ_TTL_MS = 30_000;
let readGeneration = 0;
let legacyApi = false;
function invalidateReads() {
  readGeneration += 1;
  reads.clear();
}
useStore.subscribe((state, previous) => {
  if (state.user?.token !== previous.user?.token) {
    invalidateReads();
    legacyApi = false;
  }
});

export const gasApi = {
  async get(action, params = {}) {
    const key = JSON.stringify([getToken(), action, params]);
    const cached = reads.get(key);
    if (cached && (cached.pending || cached.expiresAt > Date.now())) return cached.promise;
    const generation = readGeneration;
    const entry = { pending: true, expiresAt: 0 };
    entry.promise = gasApi.post(action, params).then(result => {
      entry.pending = false;
      entry.expiresAt = Date.now() + READ_TTL_MS;
      if (generation !== readGeneration && reads.get(key) === entry) reads.delete(key);
      return result;
    }, error => {
      if (reads.get(key) === entry) reads.delete(key);
      throw error;
    });
    reads.delete(key);
    reads.set(key, entry);
    if (reads.size > 20) reads.delete(reads.keys().next().value);
    return entry.promise;
  },

  async post(action, payload) {
    if (!API_URL) throw new Error('VITE_API_URL is not configured');
    const isRead = ['getTransactions', 'getCategories', 'getAppData'].includes(action);
    if (!isRead) invalidateReads();
    try {
      // Google Apps Script doPost handles requests better when body is stringified JSON and Content-Type text/plain
      const url = new URL(API_URL);
      url.searchParams.set('action', action);
      const token = getToken();
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          // Use text/plain to avoid CORS preflight which Apps Script blocks
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ ...payload, ...(token ? { token } : {}) })
      });
      return await parseResponse(response, token);
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    } finally {
      if (!isRead) invalidateReads();
    }
  }
};

export const authApi = {
  login: async (username, password) => {
    return gasApi.post('login', { username, password });
  },
  logout: async () => {
    return gasApi.post('logout', {});
  }
};

export const transactionApi = {
  getTransactions: async (range) => {
    if (!range?.startDate || !range?.endDate) throw new Error('A date range is required');
    const response = await gasApi.get('getTransactions', range);
    return {
      ...response,
      data: Array.isArray(response.data)
        ? response.data
            .map(normalizeTransaction)
            .filter(transaction =>
              ['income', 'expense'].includes(transaction.type) &&
              transaction.date >= range.startDate && transaction.date <= range.endDate
            )
        : []
    };
  },
  addTransaction: async (data) => {
    return gasApi.post('addTransaction', data);
  },
  deleteTransaction: async (id) => {
    return gasApi.post('deleteTransaction', { id });
  }
};

export const categoryApi = {
  getCategories: async () => {
    const response = await gasApi.get('getCategories');
    return {
      ...response,
      data: Array.isArray(response.data)
        ? response.data.map(normalizeCategory).filter(category =>
            ['income', 'expense'].includes(category.type)
          )
        : []
    };
  },
  addCategory: async (data) => {
    return gasApi.post('addCategory', data);
  },
  updateCategory: async (data) => {
    return gasApi.post('updateCategory', data);
  },
  deleteCategory: async (id) => {
    return gasApi.post('deleteCategory', { id });
  }
};

export const appDataApi = {
  invalidate: invalidateReads,
  async getData(range) {
    if (!range?.startDate || !range?.endDate) throw new Error('A date range is required');
    let response;
    try {
      if (legacyApi) throw new Error('Invalid action');
      response = await gasApi.get('getAppData', range);
    } catch (error) {
      // Keep the UI usable while the Apps Script deployment is being updated.
      if (error.message !== 'Invalid action') throw error;
      legacyApi = true;
      const [transactions, categories] = await Promise.all([
        transactionApi.getTransactions(range), categoryApi.getCategories()
      ]);
      return { transactions: transactions.data, categories: categories.data };
    }
    if (!Array.isArray(response.data?.transactions) || !Array.isArray(response.data?.categories)) {
      throw new Error('Invalid app data response');
    }
    return {
      transactions: response.data.transactions.map(normalizeTransaction).filter(transaction =>
        ['income', 'expense'].includes(transaction.type) &&
        transaction.date >= range.startDate && transaction.date <= range.endDate
      ),
      categories: response.data.categories.map(normalizeCategory).filter(category =>
        ['income', 'expense'].includes(category.type)
      )
    };
  }
};
