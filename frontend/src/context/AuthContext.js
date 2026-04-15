import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('userToken');
      const storedUser = await SecureStore.getItemAsync('userData');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (_) {
      // Ignore restore errors — user will need to log in again
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async (newToken, newUser) => {
    await SecureStore.setItemAsync('userToken', newToken);
    await SecureStore.setItemAsync('userData', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    if (!newToken || !newUser) {
      throw new Error('Invalid response from server');
    }
    // Store credentials for token refresh
    await SecureStore.setItemAsync('userEmail', email);
    await SecureStore.setItemAsync('userPassword', password);
    await saveSession(newToken, newUser);
    return newUser;
  };

  const register = async (data) => {
    const response = await api.post('/api/auth/register', data);
    const { token: newToken, user: newUser } = response.data;
    if (!newToken || !newUser) {
      throw new Error('Invalid response from server');
    }
    await saveSession(newToken, newUser);
    return newUser;
  };

  const refreshToken = async () => {
    try {
      const email = await SecureStore.getItemAsync('userEmail');
      const password = await SecureStore.getItemAsync('userPassword');
      if (!email || !password) return null;
      const response = await api.post('/api/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;
      if (newToken) {
        await saveSession(newToken, newUser);
        return newToken;
      }
    } catch (_) { }
    return null;
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (_) { }
    setToken(null);
    setUser(null);
  };

  // Update local user data (e.g. after profile update)
  const updateUser = async (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    await SecureStore.setItemAsync('userData', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
