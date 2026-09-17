const SPREADSHEET_ID = '105ybcR7e4RlPj3pFgYk_dnvk-5Wy30AsBVbtIGFBSN4';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
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
    } else if (action === 'logout') {
      return handleLogout(data);
    } else if (action === 'addTransaction') {
      return addTransaction(data);
    } else if (action === 'addCategory') {
      return addCategory(data);
    } else if (action === 'deleteCategory') {
      return deleteCategory(data);
    }

    return respondError("Invalid action");
  } catch (error) {
    return respondError(error.toString());
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getTransactions') {
      return getTransactions();
    } else if (action === 'getCategories') {
      return getCategories();
    } else if (action === 'ping') {
      return respondSuccess({ message: "pong" });
    }

    return respondError("Invalid action");
  } catch (error) {
    return respondError(error.toString());
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
      
      return respondSuccess({
        id: rows[i][idIndex],
        username: rows[i][userIndex]
      });
    }
  }
  return respondError("Username หรือ Password ไม่ถูกต้อง");
}

function handleLogout(data) {
  const sheet = getSpreadsheet().getSheetByName('Users');
  const rows = sheet.getDataRange().getValues();
  const idIndex = rows[0].indexOf('id');
  const lastedLogoutIndex = rows[0].indexOf('lastedLogout');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] == data.userId) {
      sheet.getRange(i + 1, lastedLogoutIndex + 1).setValue(new Date().toISOString());
      return respondSuccess({ message: "Logout successful" });
    }
  }
  return respondSuccess({ message: "User not found, but logged out" });
}

function addTransaction(data) {
  const sheet = getSpreadsheet().getSheetByName('Transactions');
  // id, type, category, amount, note, date, buyer_seller, unit_price, quantity, cat_type, cat_name, cat_emoji, created_at
  const id = Utilities.getUuid();
  const createdAt = new Date().toISOString();
  
  sheet.appendRow([
    id,
    data.type,
    data.category,
    data.amount,
    data.note || '',
    data.date,
    data.buyer_seller || '',
    data.unit_price || 0,
    data.quantity || 1,
    data.cat_type || '',
    data.cat_name || '',
    data.cat_emoji || '',
    createdAt
  ]);
  
  // If a category was used, we might want to update its usage_count
  updateCategoryUsage(data.category);

  return respondSuccess({ id: id, message: "Transaction added successfully" });
}

function getTransactions() {
  const sheet = getSpreadsheet().getSheetByName('Transactions');
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return respondSuccess([]);
  
  const headers = rows[0];
  const result = [];
  
  for (let i = 1; i < rows.length; i++) {
    let rowData = {};
    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j]] = rows[i][j];
    }
    result.push(rowData);
  }
  return respondSuccess(result);
}

function addCategory(data) {
  const sheet = getSpreadsheet().getSheetByName('Categories');
  // id, type, name, emoji, usage_count
  const id = 'custom_' + data.type + '_' + data.name;
  
  sheet.appendRow([
    id,
    data.type,
    data.name,
    data.emoji || '🔖',
    0
  ]);
  
  return respondSuccess({ id: id, message: "Category added successfully" });
}

function getCategories() {
  const sheet = getSpreadsheet().getSheetByName('Categories');
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return respondSuccess([]);
  
  const headers = rows[0];
  const result = [];
  
  for (let i = 1; i < rows.length; i++) {
    let rowData = {};
    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j]] = rows[i][j];
    }
    result.push(rowData);
  }
  return respondSuccess(result);
}

function deleteCategory(data) {
  const sheet = getSpreadsheet().getSheetByName('Categories');
  const rows = sheet.getDataRange().getValues();
  const idIndex = rows[0].indexOf('id');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] === data.id) {
      sheet.deleteRow(i + 1);
      return respondSuccess({ message: "Category deleted" });
    }
  }
  return respondError("Category not found");
}

function updateCategoryUsage(categoryId) {
  if (!categoryId) return;
  const sheet = getSpreadsheet().getSheetByName('Categories');
  const rows = sheet.getDataRange().getValues();
  const idIndex = rows[0].indexOf('id');
  const usageIndex = rows[0].indexOf('usage_count');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] === categoryId) {
      const currentVal = parseInt(rows[i][usageIndex]) || 0;
      sheet.getRange(i + 1, usageIndex + 1).setValue(currentVal + 1);
      break;
    }
  }
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
    userSheet.appendRow(['u1', 'admin', '1234', new Date().toISOString(), '', '', '']); // Default user
  }
  
  // Transactions Sheet
  let txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    txSheet = ss.insertSheet('Transactions');
    txSheet.appendRow(['id', 'type', 'category', 'amount', 'note', 'date', 'buyer_seller', 'unit_price', 'quantity', 'cat_type', 'cat_name', 'cat_emoji', 'created_at']);
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
    
    defaults.forEach(d => catSheet.appendRow(d));
  }
}
