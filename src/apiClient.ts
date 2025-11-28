import axios from 'axios';

// The base URL is now handled by the Vite proxy
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true
});
// ...existing code...

const API_BASE_URL = 'http://localhost:3003'; // Change from 5174 to 3003

// ...existing code...

export { apiClient };
