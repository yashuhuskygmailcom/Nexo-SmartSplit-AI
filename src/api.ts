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

// ---------- BADGES ----------
export function getBadges() {
  return api.get('/badges');
}

export function createBadge(badgeData: any) {
  return api.post('/badges', badgeData);
}

export function updateBadge(id: number | string, badgeData: any) {
  return api.put(`/badges/${id}`, badgeData);
}

export function deleteBadge(id: number | string) {
  return api.delete(`/badges/${id}`);
}

export function awardBadge(badgeId: number | string, userId: number | string) {
  return api.post(`/badges/${badgeId}/award/${userId}`);
}

export function revokeBadge(badgeId: number | string, userId: number | string) {
  return api.delete(`/badges/${badgeId}/award/${userId}`);
}

// ---------- LEADERBOARD ----------
export function getLeaderboard() {
  return api.get('/leaderboard');
}

// ---------- DASHBOARD ----------
export function getDashboardData() {
  return api.get('/dashboard');
}

// ---------- USER PROFILE ----------
export function updateProfile(profileData: any) {
  return api.put('/user', profileData);
}

// ---------- WALLET ----------
export function getWallet() {
  return api.get('/wallet');
}

export function addWalletFunds(amount: number, description?: string) {
  return api.post('/wallet/add-funds', { amount, description });
}

export function payDebtFromWallet(amount: number, friendId?: number, description?: string) {
  return api.post('/wallet/pay-debt', { amount, friendId, description });
}

export function getWalletTransactions() {
  return api.get('/wallet/transactions');
}

// ---------- BUDGETS ----------
export function getBudgets() {
  return api.get('/budgets');
}

export function createBudget(name: string, budget_amount: number, icon?: string, color?: string) {
  return api.post('/budgets', { name, budget_amount, icon, color });
}

export function updateBudget(budgetId: string | number, name: string, budget_amount: number, icon?: string, color?: string) {
  return api.put(`/budgets/${budgetId}`, { name, budget_amount, icon, color });
}

export function deleteBudget(budgetId: string | number) {
  return api.delete(`/budgets/${budgetId}`);
}
