import axios from 'axios';

// Set to true to use mock data instead of real API
export const USE_MOCK = false;   // was true
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ulpf-95ou.onrender.com/api';  // was localhost

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ulpf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ulpf_token');
      localStorage.removeItem('ulpf_user');
      window.location.href = '/login';
    }
   
const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
