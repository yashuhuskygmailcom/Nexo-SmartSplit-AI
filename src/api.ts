import axios from 'axios';

const API_BASE_URL = '/api';

// Set up axios to send credentials with every request
axios.defaults.withCredentials = true;

// User and Session Management
export const checkSession = () => axios.get(`${API_BASE_URL}/check-session`);
export const signup = (userData: any) => axios.post(`${API_BASE_URL}/signup`, userData);
export const login = (credentials: any) => axios.post(`${API_BASE_URL}/login`, credentials);
export const logout = () => axios.post(`${API_BASE_URL}/logout`);
export const getUser = (email: string) => axios.get(`${API_BASE_URL}/user/${email}`);

// Expense Management
export const getExpenses = () => axios.get(`${API_BASE_URL}/expenses`);
export const createExpense = (expenseData: any) => axios.post(`${API_BASE_URL}/expenses`, expenseData);
export const updateExpense = (id: string, expenseData: any) => axios.put(`${API_BASE_URL}/expenses/${id}`, expenseData);
export const deleteExpense = (id: string) => axios.delete(`${API_BASE_URL}/expenses/${id}`);
export const getExpenseSummary = () => axios.get(`${API_BASE_URL}/expenses/summary`);

// Friends Management
export const getFriends = () => axios.get(`${API_BASE_URL}/friends`);
export const addFriend = (friendId: any) => axios.post(`${API_BASE_URL}/friends`, friendId);

// Group Management
export const getGroups = () => axios.get(`${API_BASE_URL}/groups`);
export const createGroup = (groupData: any) => axios.post(`${API_BASE_URL}/groups`, groupData);

// OCR
export const scanReceipt = (formData: FormData) => axios.post(`${API_BASE_URL}/scan-receipt`, formData, {
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

// Dashboard
export const getDashboardData = () => axios.get(`${API_BASE_URL}/dashboard`);
