import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const script = readFileSync('Code.gs', 'utf8');

function createBackend() {
  const sessions = new Map();
  const users = [
    ['id', 'username', 'password', 'lastedLogin', 'lastedLogout'],
    ['u1', 'admin', 'secret', '', '']
  ];
  const userSheet = {
    getDataRange: () => ({ getValues: () => users }),
    getRange: (row, column) => ({ setValue: value => { users[row - 1][column - 1] = value; } })
  };
  const categorySheet = { getDataRange: () => ({ getValues: () => [['id', 'type', 'name', 'emoji', 'usage_count']] }) };
  const transactionHeaders = ['id', 'created_at', 'type', 'user_id', 'category', 'amount', 'note', 'date'];
  const transactions = [transactionHeaders];
  const transactionSheet = { getDataRange: () => ({ getValues: () => transactions }) };
  const context = {
    Date,
    SpreadsheetApp: { openById: () => ({
      getSheetByName: name => name === 'Users' ? userSheet : name === 'Transactions' ? transactionSheet : categorySheet,
      getSpreadsheetTimeZone: () => 'Asia/Bangkok'
    }) },
    CacheService: { getScriptCache: () => ({
      get: key => sessions.get(key) || null,
      put: (key, value) => sessions.set(key, value),
      remove: key => sessions.delete(key)
    }) },
    Utilities: {
      getUuid: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
      formatDate: date => {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(date);
        const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
        return `${value.year}-${value.month}-${value.day}`;
      }
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: value => ({ setMimeType: () => JSON.parse(value) })
    }
  };
  vm.runInNewContext(script, context);
  const post = (action, body = {}) => context.doPost({ parameter: { action }, postData: { contents: JSON.stringify(body) } });
  return { post, get: (action, token) => context.doGet({ parameter: { action, token } }), sessions, users, transactions };
}

describe('Apps Script authentication', () => {
  it('rejects unauthenticated reads and writes', () => {
    const backend = createBackend();
    expect(backend.post('getCategories').error).toBe('UNAUTHORIZED');
    expect(backend.post('deleteCategory', { id: 'income_1' }).error).toBe('UNAUTHORIZED');
    expect(backend.get('getCategories').success).toBe(false);
  });

  it('issues a session on login and revokes it on logout', () => {
    const backend = createBackend();
    const login = backend.post('login', { username: 'admin', password: 'secret' });
    expect(login.success).toBe(true);
    const token = login.data.token;
    expect(backend.post('getCategories', { token }).success).toBe(true);
    expect(backend.post('logout', { token }).success).toBe(true);
    expect(backend.post('getCategories', { token }).error).toBe('UNAUTHORIZED');
  });

  it('rejects malformed transactions before writing to Sheets', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    expect(backend.post('addTransaction', {
      token, type: 'category', amount: 0, unit_price: 0, quantity: 0, date: '2026-09-17'
    }).error).toBe('Invalid transaction');
  });

  it('returns only rows in the requested inclusive date range', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    backend.transactions.push(
      ['tx-1', '', 'income', 'u1', 'income_1', 100, '', new Date('2026-09-16T17:00:00.000Z')],
      ['tx-2', '', 'expense', 'u1', 'expense_1', 50, '', '2026-09-18'],
      ['tx-3', 'income', 'custom_income_1', 100, 'note', '2026-09-17', '', 5],
      ['tx-4', '', 'category', 'u1', '', 0, '', '2026-09-17']
    );
    const result = backend.post('getTransactions', { token, startDate: '2026-09-17', endDate: '2026-09-17' });
    expect(result.success).toBe(true);
    expect(result.data.map(row => row.id)).toEqual(['tx-1', 'tx-3']);
    expect(backend.post('getTransactions', { token, startDate: '', endDate: '' }).error).toBe('Invalid date filter');
  });
});
