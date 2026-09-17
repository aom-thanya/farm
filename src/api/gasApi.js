// API Layer for Google Apps Script
// Users need to replace this URL with their own deployed Apps Script Web App URL
const API_URL = import.meta.env.VITE_GAS_API_URL || 'YOUR_GAS_WEB_APP_URL';

export const gasApi = {
  async get(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.append('action', action);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    try {
      // NOTE: Using fetch for GET might get blocked by CORS from google script if not setup correctly.
      // Often, JSONP or passing via POST is preferred if standard GET fails.
      // We will try standard fetch GET assuming Web App deployed "Execute as: me, Access: Anyone"
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  async post(action, payload) {
    try {
      // Google Apps Script doPost handles requests better when body is stringified JSON and Content-Type text/plain
      const response = await fetch(API_URL + '?action=' + action, {
        method: 'POST',
        headers: {
          // Use text/plain to avoid CORS preflight which Apps Script blocks
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }
};

export const authApi = {
  login: async (username, password) => {
    return gasApi.post('login', { username, password });
  },
  logout: async (userId) => {
    return gasApi.post('logout', { userId });
  }
};

export const transactionApi = {
  getTransactions: async () => {
    return gasApi.get('getTransactions');
  },
  addTransaction: async (data) => {
    return gasApi.post('addTransaction', data);
  }
};

export const categoryApi = {
  getCategories: async () => {
    return gasApi.get('getCategories');
  },
  addCategory: async (data) => {
    return gasApi.post('addCategory', data);
  },
  deleteCategory: async (id) => {
    return gasApi.post('deleteCategory', { id });
  }
};
