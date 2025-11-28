import axios from 'axios';

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: '/api',
});

// Auth
export const checkSession = () => api.get('/check-session');
export const register = (username: string, email: string, password: string) => api.post('/signup', { username, email, password });
export const login = (email: string, password: string) => api.post('/login', { email, password });
export const logout = () => api.post('/logout');

// Expenses
export const getExpenses = () => api.get('/expenses');
export const createExpense = (expenseData: any) => api.post('/expenses', expenseData);
export const updateExpense = (id: string, expenseData: any) => api.put(`/expenses/${id}`, expenseData);
export const deleteExpense = (id: string) => api.delete(`/expenses/${id}`);

// Friends
export const getFriends = () => api.get('/friends');
export const addFriend = (friendId: string) => api.post('/friends', { friendId });

// Groups
export const getGroups = () => api.get('/groups');
export const createGroup = (groupData: any) => api.post('/groups', groupData);

// OCR
export const scanReceipt = (formData: FormData) => api.post('/scan-receipt', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// User
export const getUserByEmail = (email: string) => api.get(`/user/${email}`);
