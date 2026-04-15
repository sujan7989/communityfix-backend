import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://communityfix-backend-ibxq.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) { }
  return config;
});

// Auto-refresh token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please check your connection.'));
    }
    if (!error.response) {
      return Promise.reject(new Error('Cannot connect to server. Please check your internet connection.'));
    }

    // Auto-refresh on 401 (expired token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh using stored credentials
        const email = await SecureStore.getItemAsync('userEmail');
        const password = await SecureStore.getItemAsync('userPassword');

        if (email && password) {
          const res = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
          const newToken = res.data?.token;
          if (newToken) {
            await SecureStore.setItemAsync('userToken', newToken);
            if (res.data?.user) {
              await SecureStore.setItemAsync('userData', JSON.stringify(res.data.user));
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
