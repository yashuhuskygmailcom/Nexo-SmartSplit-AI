// src/api.ts
import axios from 'axios';

// In dev, Vite proxies /api to http://localhost:3003 (check vite.config if needed)
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ---------- AUTH / USER ----------
export function checkSession() {
  return api.get('/check-session');
}

export function signup(userData: any) {
  return api.post('/signup', userData);
}

export function login(credentials: any) {
  return api.post('/login', credentials);
}

export function logout() {
  return api.post('/logout');
}

export function getUser(email: string) {
  return api.get(`/user/${encodeURIComponent(email)}`);
}

// ---------- EXPENSES ----------
export function getExpenses() {
  return api.get('/expenses');
}

export function createExpense(expenseData: any) {
  return api.post('/expenses', expenseData);
}

export function updateExpense(id: string | number, expenseData: any) {
  return api.put(`/expenses/${id}`, expenseData);
}

export function deleteExpense(id: string | number) {
  return api.delete(`/expenses/${id}`);
}

// ✅ SUMMARY – used by chatbot
export function getExpenseSummary() {
  return api.get('/expenses/summary'); // { totalPaid, totalOwed }
}

// ---------- FRIENDS ----------
export function getFriends() {
  return api.get('/friends');
}

export function addFriend(friendId: number) {
  return api.post('/friends', { friendId });
}

// ---------- GROUPS ----------
export function getGroups() {
  return api.get('/groups');
}

export function createGroup(groupData: any) {
  return api.post('/groups', groupData);
}

// ---------- OCR ----------
export function scanReceipt(formData: FormData) {
  return api.post('/scan-receipt', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// ---------- DASHBOARD ----------
export function getDashboardData() {
  return api.get('/dashboard');
}
