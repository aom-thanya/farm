const SPREADSHEET_ID = '105ybcR7e4RlPj3pFgYk_dnvk-5Wy30AsBVbtIGFBSN4';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Find a row using only its ID column; do not download the entire sheet.
function getHeaders(sheet) {
  const width = sheet.getLastColumn();
  return width ? sheet.getRange(1, 1, 1, width).getValues()[0] : [];
}

function findIdRow(sheet, headers, id) {
  const column = headers.indexOf('id') + 1;
  const lastRow = sheet.getLastRow();
  if (!column || lastRow < 2 || id === undefined || id === null || String(id) === '') return 0;
  const cell = sheet.getRange(2, column, lastRow - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).matchCase(true)
    .useRegularExpression(false).findNext();
  return cell ? cell.getRow() : 0;
}

// Batch adjacent edited cells without overwriting untouched cells or formulas.
function writeFields(sheet, row, headers, fields) {
  const edits = Object.keys(fields)
    .filter(field => fields[field] !== undefined && headers.indexOf(field) !== -1)
    .map(field => ({ column: headers.indexOf(field) + 1, value: fields[field] }))
    .sort((a, b) => a.column - b.column);
  for (let i = 0; i < edits.length;) {
    const first = edits[i];
    const values = [first.value];
    i++;
    while (i < edits.length && edits[i].column === first.column + values.length) {
      values.push(edits[i++].value);
    }
    sheet.getRange(row, first.column, 1, values.length).setValues([values]);
  }
}

// Fixed lifetime: reopening the browser keeps the same session for 30 days.
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function saveSession(token, id) {
  const session = { id: String(id), expiresAt: Date.now() + SESSION_MS };
  PropertiesService.getScriptProperties().setProperty('session_' + token, JSON.stringify(session));
  return session;
}

function getSession(data) {
  const token = data && data.token;
  if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/.test(token)) return null;
  const key = 'session_' + token;
  const properties = PropertiesService.getScriptProperties();
  const stored = properties.getProperty(key);
  if (stored) {
    const session = JSON.parse(stored);
    if (session.id && Number.isFinite(session.expiresAt) && session.expiresAt > Date.now()) return session;
    properties.deleteProperty(key);
    return null;
  }
  // Preserve still-valid sessions from the previous six-hour cache implementation.
  const legacy = CacheService.getScriptCache().get(key);
  if (!legacy) return null;
  const session = JSON.parse(legacy);
  if (!session.id) return null;
  const migrated = saveSession(token, session.id);
  CacheService.getScriptCache().remove(key);
  return migrated;
}

function clearExpiredSessions() {
  const properties = PropertiesService.getScriptProperties();
  const values = properties.getProperties();
  Object.keys(values).forEach(key => {
    if (!key.startsWith('session_')) return;
    try {
      const session = JSON.parse(values[key]);
      if (Number.isFinite(session.expiresAt) && session.expiresAt > Date.now()) return;
    } catch (_) { /* Remove invalid session records as well. */ }
    properties.deleteProperty(key);
  });
}

function doPost(e) {
  try {
    const action = e.parameter.action;
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    if (action === 'login') {
      return handleLogin(data);
    }
    const session = getSession(data);
    if (!session) return respondError('UNAUTHORIZED');

    if (action === 'logout') {
      return handleLogout(session, data.token);
    } else if (action === 'getAppData') {
      const spreadsheet = getSpreadsheet();
      return respondSuccess({
        transactions: readTransactions(data, spreadsheet),
        categories: readCategories(spreadsheet)
      });
    } else if (action === 'getTransactions') {
      return getTransactions(data);
    } else if (action === 'getCategories') {
      return getCategories();
    } else if (action === 'addTransaction') {
      return addTransaction(data, session);
    } else if (action === 'deleteTransaction') {
      return deleteTransaction(data);
    } else if (action === 'addCategory') {
      return addCategory(data);
    } else if (action === 'updateCategory') {
      return updateCategory(data);
    } else if (action === 'deleteCategory') {
      return deleteCategory(data);
    }

    return respondError("Invalid action");
  } catch (error) {
    return respondError(error.message || error.toString());
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'ping') {
      return respondSuccess({ message: "pong" });
    }

    return respondError("Invalid action");
  } catch (error) {
    return respondError(error.message || error.toString());
  }
}

function handleLogin(data) {
  const sheet = getSpreadsheet().getSheetByName('Users');
  const rows = sheet.getDataRange().getValues();
  // Assume Row 1 is header: id, username, password, createAt, updateAt, lastedLogin, lastedLogout
  const headers = rows[0];
  const userIndex = headers.indexOf('username');
  const passIndex = headers.indexOf('password');
  const idIndex = headers.indexOf('id');
  const lastedLoginIndex = headers.indexOf('lastedLogin');

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][userIndex] == data.username && rows[i][passIndex] == data.password) {
      // Update lastedLogin
      sheet.getRange(i + 1, lastedLoginIndex + 1).setValue(new Date().toISOString());
      const token = Utilities.getUuid();
      clearExpiredSessions();
      saveSession(token, rows[i][idIndex]);
      return respondSuccess({
        id: rows[i][idIndex],
        username: rows[i][userIndex],
        token: token
      });
    }
  }
  return respondError("Username หรือ Password ไม่ถูกต้อง");
}

function handleLogout(session, token) {
  PropertiesService.getScriptProperties().deleteProperty('session_' + token);
  CacheService.getScriptCache().remove('session_' + token);
  const sheet = getSpreadsheet().getSheetByName('Users');
  const headers = getHeaders(sheet);
  const row = findIdRow(sheet, headers, session.id);
  if (row) {
    writeFields(sheet, row, headers, { lastedLogout: new Date().toISOString() });
    return respondSuccess({ message: "Logout successful" });
  }
  return respondSuccess({ message: "User not found, but logged out" });
}

function addTransaction(data, session) {
  const type = String(data.type || '').trim().toLowerCase();
  const amount = Number(data.amount);
  const unitPrice = Number(data.unit_price);
  const quantity = Number(data.quantity);
  if (['income', 'expense'].indexOf(type) === -1 || !Number.isFinite(amount) || amount <= 0 ||
      !Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(quantity) || quantity <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(data.date || ''))) {
    return respondError('Invalid transaction');
  }
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Transactions');
  const id = Utilities.getUuid();
  const createdAt = new Date().toISOString();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = {
    id,
    created_at: createdAt,
    type: type,
    user_id: session.id,
    category: data.category || '',
    amount: amount,
    note: data.note || '',
    date: data.date || '',
    buyer_seller: data.buyer_seller || '',
    unit_price: unitPrice,
    quantity: quantity,
    cat_type: data.cat_type || '',
    cat_name: data.cat_name || '',
    cat_emoji: data.cat_emoji || ''
  };

  sheet.appendRow(headers.map(header => values[header] ?? ''));
  
  // If a category was used, we might want to update its usage_count
  updateCategoryUsage(data.category, spreadsheet);

  return respondSuccess({ id: id, message: "Transaction added successfully" });
}

function getTransactions(filter) {
  return respondSuccess(readTransactions(filter, getSpreadsheet()));
}

function readTransactions(filter, spreadsheet) {
  const startDate = String(filter.startDate || '');
  const endDate = String(filter.endDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    throw new Error('Invalid date filter');
  }
  const rows = spreadsheet.getSheetByName('Transactions').getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  const createdIndex = headers.indexOf('created_at');
  const typeIndex = headers.indexOf('type');
  const dateIndex = headers.indexOf('date');
  const amountIndex = headers.indexOf('amount');
  let timeZone;
  const dates = new Map();
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const legacyType = String(row[createdIndex]).toLowerCase();
    const isLegacyShiftedRow = ['income', 'expense'].indexOf(legacyType) !== -1;
    const type = isLegacyShiftedRow ? legacyType : String(row[typeIndex]).toLowerCase();
    if (['income', 'expense'].indexOf(type) === -1) continue;
    const rawDate = row[isLegacyShiftedRow ? amountIndex : dateIndex];
    let date;
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      date = rawDate;
    } else {
      const parsedDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      const timestamp = parsedDate.getTime();
      if (Number.isNaN(timestamp)) continue;
      date = dates.get(timestamp);
      if (!date) {
        // Read the spreadsheet setting once, and format each distinct date once.
        if (!timeZone) timeZone = spreadsheet.getSpreadsheetTimeZone();
        date = Utilities.formatDate(parsedDate, timeZone, 'yyyy-MM-dd');
        dates.set(timestamp, date);
      }
    }
    if (date < startDate || date > endDate) continue;
    // Build response objects only for matching rows.
    const rowData = {};
    for (let j = 0; j < headers.length; j++) rowData[headers[j]] = row[j];
    if (isLegacyShiftedRow) rowData.amount = date;
    else rowData.date = date;
    result.push(rowData);
  }
  return result;
}

function deleteTransaction(data) {
  const sheet = getSpreadsheet().getSheetByName('Transactions');
  const row = findIdRow(sheet, getHeaders(sheet), data.id);
  if (!row) return respondError("Transaction not found");
  sheet.deleteRow(row);
  return respondSuccess({ message: "Transaction deleted" });
}

function addCategory(data) {
  if (['income', 'expense'].indexOf(String(data.type || '')) === -1 || !String(data.name || '').trim()) {
    return respondError('Invalid category');
  }
  const sheet = getSpreadsheet().getSheetByName('Categories');
  // id, type, name, emoji, usage_count
  const id = 'custom_' + Utilities.getUuid();
  
  sheet.appendRow([
    id,
    data.type,
    data.name,
    data.emoji || '🔖',
    0
  ]);
  
  return respondSuccess({ id: id, message: "Category added successfully" });
}

function updateCategory(data) {
  const sheet = getSpreadsheet().getSheetByName('Categories');
  const headers = getHeaders(sheet);
  const row = findIdRow(sheet, headers, data.id);
  if (!row) return respondError("Category not found");
  writeFields(sheet, row, headers, { type: data.type, name: data.name, emoji: data.emoji });
  return respondSuccess({ message: "Category updated successfully" });
}

function getCategories() {
  return respondSuccess(readCategories(getSpreadsheet()));
}

function readCategories(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Categories');
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const result = [];
  
  for (let i = 1; i < rows.length; i++) {
    let rowData = {};
    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j]] = rows[i][j];
    }
    result.push(rowData);
  }
  return result;
}

function deleteCategory(data) {
  const sheet = getSpreadsheet().getSheetByName('Categories');
  const row = findIdRow(sheet, getHeaders(sheet), data.id);
  if (!row) return respondError("Category not found");
  sheet.deleteRow(row);
  return respondSuccess({ message: "Category deleted" });
}

function updateCategoryUsage(categoryId, spreadsheet) {
  if (!categoryId) return;
  const sheet = (spreadsheet || getSpreadsheet()).getSheetByName('Categories');
  const headers = getHeaders(sheet);
  const usageColumn = headers.indexOf('usage_count') + 1;
  if (!usageColumn) return;
  const row = findIdRow(sheet, headers, categoryId);
  if (!row) return;
  const cell = sheet.getRange(row, usageColumn);
  cell.setValue((parseInt(cell.getValue(), 10) || 0) + 1);
}

function respondSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respondError(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// SETUP FUNCTION - Run this once from the editor to create sheets and headers
function setupSheets() {
  const ss = getSpreadsheet();
  
  // Users Sheet
  let userSheet = ss.getSheetByName('Users');
  if (!userSheet) {
    userSheet = ss.insertSheet('Users');
    userSheet.appendRow(['id', 'username', 'password', 'createAt', 'updateAt', 'lastedLogin', 'lastedLogout']);
  }
  
  // Transactions Sheet
  let txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    txSheet = ss.insertSheet('Transactions');
    txSheet.appendRow(['id', 'created_at', 'type', 'user_id', 'category', 'amount', 'note', 'date', 'buyer_seller', 'unit_price', 'quantity', 'cat_type', 'cat_name', 'cat_emoji']);
  }
  
  // Categories Sheet
  let catSheet = ss.getSheetByName('Categories');
  if (!catSheet) {
    catSheet = ss.insertSheet('Categories');
    catSheet.appendRow(['id', 'type', 'name', 'emoji', 'usage_count']);
    
    // Default categories
    const defaults = [
      ['income_1', 'income', 'ตะไคร้', '🌱', 0],
      ['income_2', 'income', 'กล้วย', '🍌', 0],
      ['income_3', 'income', 'ปลานิล', '🐟', 0],
      ['expense_1', 'expense', 'ค่าจ้าง', '👷', 0],
      ['expense_2', 'expense', 'ปุ๋ย', '💩', 0],
      ['expense_3', 'expense', 'อาหารปลา', '🦐', 0],
      ['expense_4', 'expense', 'น้ำมันรถ', '⛽', 0],
    ];
    
    catSheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
  }
}
