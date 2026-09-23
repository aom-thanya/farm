import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const script = readFileSync('Code.gs', 'utf8');

function createBackend() {
  const sessions = new Map();
  const properties = new Map();
  const users = [
    ['id', 'username', 'password', 'lastedLogin', 'lastedLogout'],
    ['u1', 'admin', 'secret', '', '']
  ];
  function mockSheet(rows) {
    const sheet = {
      getDataRange: vi.fn(() => ({ getValues: () => rows.map(row => [...row]) })),
      getLastColumn: () => rows[0]?.length || 0,
      getLastRow: () => rows.length,
      appendRow: vi.fn(row => rows.push([...row])),
      deleteRow: vi.fn(row => rows.splice(row - 1, 1)),
      getRange: vi.fn((row, column, height = 1, width = 1) => ({
        getValues: () => rows.slice(row - 1, row - 1 + height).map(value => value.slice(column - 1, column - 1 + width)),
        getValue: () => rows[row - 1][column - 1],
        setValue: value => { rows[row - 1][column - 1] = value; },
        setValues: values => {
          sheet.writes.push({ row, column, values });
          values.forEach((valuesRow, offset) => {
            if (!rows[row - 1 + offset]) rows[row - 1 + offset] = [];
            valuesRow.forEach((value, x) => { rows[row - 1 + offset][column - 1 + x] = value; });
          });
        },
        createTextFinder: text => {
          const finder = {
            matchEntireCell: vi.fn(() => finder),
            matchCase: vi.fn(() => finder),
            useRegularExpression: vi.fn(() => finder),
            findNext: () => {
              expect(finder.matchEntireCell).toHaveBeenCalledWith(true);
              expect(finder.matchCase).toHaveBeenCalledWith(true);
              expect(finder.useRegularExpression).toHaveBeenCalledWith(false);
              const offset = rows.slice(row - 1, row - 1 + height).findIndex(value => String(value[column - 1]) === text);
              return offset < 0 ? null : { getRow: () => row + offset };
            }
          };
          return finder;
        }
      })),
      writes: []
    };
    return sheet;
  }
  const userSheet = mockSheet(users);
  const categories = [['id', 'type', 'name', 'emoji', 'usage_count']];
  const categorySheet = mockSheet(categories);
  const transactionHeaders = ['id', 'created_at', 'type', 'user_id', 'category', 'amount', 'note', 'date'];
  const transactions = [transactionHeaders];
  const transactionSheet = mockSheet(transactions);
  const openSpreadsheet = vi.fn(() => ({
    getSheetByName: name => name === 'Users' ? userSheet : name === 'Transactions' ? transactionSheet : categorySheet,
    getSpreadsheetTimeZone: getTimeZone
  }));
  const getTimeZone = vi.fn(() => 'Asia/Bangkok');
  const context = {
    Date,
    SpreadsheetApp: { openById: openSpreadsheet },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties.get(key) || null,
      setProperty: (key, value) => properties.set(key, value),
      deleteProperty: key => properties.delete(key),
      getProperties: () => Object.fromEntries(properties)
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
  return { post, get: (action, token) => context.doGet({ parameter: { action, token } }), sessions, properties, users, transactions, getTimeZone, categories, userSheet, categorySheet, transactionSheet, openSpreadsheet };
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

  it('keeps sessions after cache eviction and expires them after 30 days', () => {
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(1000);
      const backend = createBackend();
      const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
      backend.sessions.clear();
      now.mockReturnValue(1000 + 29 * 86400000);
      expect(backend.post('getCategories', { token }).success).toBe(true);
      now.mockReturnValue(1000 + 30 * 86400000);
      expect(backend.post('getCategories', { token }).error).toBe('UNAUTHORIZED');
      expect(backend.properties.size).toBe(0);
    } finally { now.mockRestore(); }
  });

  it('migrates a valid legacy session and still revokes it on logout', () => {
    const backend = createBackend();
    const token = '22222222-2222-4222-8222-222222222222';
    backend.sessions.set('session_' + token, JSON.stringify({ id: 'u1' }));
    expect(backend.post('getCategories', { token }).success).toBe(true);
    expect(backend.properties.has('session_' + token)).toBe(true);
    expect(backend.sessions.size).toBe(0);
    backend.post('logout', { token });
    expect(backend.post('getCategories', { token }).error).toBe('UNAUTHORIZED');
  });

  it('loads both datasets together and reads timezone once for many dated rows', () => {
    const backend = createBackend();
    expect(backend.post('getAppData').error).toBe('UNAUTHORIZED');
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    for (let i = 0; i < 1000; i++) {
      backend.transactions.push([String(i), '', 'income', 'u1', 'income_1', 100, '', new Date('2026-09-16T17:00:00.000Z')]);
    }
    const result = backend.post('getAppData', { token, startDate: '2026-09-17', endDate: '2026-09-17' });
    expect(result.success).toBe(true);
    expect(result.data.transactions).toHaveLength(1000);
    expect(result.data.categories).toEqual([]);
    expect(backend.getTimeZone).toHaveBeenCalledTimes(1);
  });

  it('deletes only the exact transaction ID without reading the whole sheet', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    backend.transactions.push(['tx-10'], ['tx-1'], ['TX-1']);
    expect(backend.post('deleteTransaction', { token, id: 'tx-1' }).success).toBe(true);
    expect(backend.transactions.slice(1).map(row => row[0])).toEqual(['tx-10', 'TX-1']);
    expect(backend.transactionSheet.getDataRange).not.toHaveBeenCalled();
    expect(backend.post('deleteTransaction', { token, id: 'missing' }).error).toBe('Transaction not found');
  });

  it('batches category edits and preserves usage and unrelated formulas', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    backend.categories[0].push('custom');
    backend.categories.push(['c1', 'income', 'Mango', '🥭', 7, '=1+1']);
    expect(backend.post('updateCategory', { token, id: 'c1', type: 'expense', name: 'Fuel', emoji: '⛽' }).success).toBe(true);
    expect(backend.categories[1]).toEqual(['c1', 'expense', 'Fuel', '⛽', 7, '=1+1']);
    expect(backend.categorySheet.writes).toEqual([{ row: 2, column: 2, values: [['expense', 'Fuel', '⛽']] }]);
    expect(backend.categorySheet.getDataRange).not.toHaveBeenCalled();
    expect(backend.post('deleteCategory', { token, id: 'c1' }).success).toBe(true);
    expect(backend.categories).toHaveLength(1);
  });

  it('handles reordered columns and partial category edits without overwriting gaps', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    backend.categories[0] = ['emoji', 'usage_count', 'id', 'name', 'type'];
    backend.categories.push(['🥭', '=2+3', 'c1', 'Mango', 'income']);
    expect(backend.post('updateCategory', { token, id: 'c1', name: 'Banana', emoji: '🍌' }).success).toBe(true);
    expect(backend.categories[1]).toEqual(['🍌', '=2+3', 'c1', 'Banana', 'income']);
    expect(backend.categorySheet.writes).toHaveLength(2);
  });

  it('opens the spreadsheet once when adding a transaction and increments only its category', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    backend.categories.push(['c1', 'income', 'Mango', '🥭', 2]);
    backend.openSpreadsheet.mockClear();
    const result = backend.post('addTransaction', {
      token, type: 'income', category: 'c1', amount: 10, unit_price: 5, quantity: 2, date: '2026-09-17'
    });
    expect(result.success).toBe(true);
    expect(backend.transactions[1][5]).toBe(10);
    expect(backend.categories[1][4]).toBe(3);
    expect(backend.openSpreadsheet).toHaveBeenCalledTimes(1);
    expect(backend.categorySheet.getDataRange).not.toHaveBeenCalled();
  });

  it('records logout without downloading the Users sheet again', () => {
    const backend = createBackend();
    const token = backend.post('login', { username: 'admin', password: 'secret' }).data.token;
    backend.userSheet.getDataRange.mockClear();
    expect(backend.post('logout', { token }).success).toBe(true);
    expect(backend.users[1][4]).not.toBe('');
    expect(backend.userSheet.getDataRange).not.toHaveBeenCalled();
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
