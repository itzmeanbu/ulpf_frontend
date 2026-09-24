import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Turns the backend's /auth/me answer into the user object the app uses.
  const shape = (data) => ({
    id: data.id,
    email: data.email,
    name: data.email,
    role: data.role,
    sensitiveAccess: Boolean(data.sensitive_access ?? data.sensitiveAccess),
  });

  const refreshUser = useCallback(async () => {
    const data = await authService.getCurrentUser();
    const u = shape(data);
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ulpf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => {
        localStorage.removeItem('ulpf_token');
        localStorage.removeItem('ulpf_user');
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    localStorage.setItem('ulpf_token', response.token);
    // Load the real account details (role + sensitive access) right away.
    await refreshUser();
    return response;
  };

  // Backend /auth/register returns { status: 'pending' }. No token yet:
  // an admin has to approve the account first.
  const register = (name, email, password) => authService.register(name, email, password);

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
