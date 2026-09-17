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
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => name === 'Users' ? userSheet : categorySheet }) },
    CacheService: { getScriptCache: () => ({
      get: key => sessions.get(key) || null,
      put: (key, value) => sessions.set(key, value),
      remove: key => sessions.delete(key)
    }) },
    Utilities: { getUuid: vi.fn(() => '11111111-1111-4111-8111-111111111111') },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: value => ({ setMimeType: () => JSON.parse(value) })
    }
  };
  vm.runInNewContext(script, context);
  const post = (action, body = {}) => context.doPost({ parameter: { action }, postData: { contents: JSON.stringify(body) } });
  return { post, get: (action, token) => context.doGet({ parameter: { action, token } }), sessions, users };
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
});
