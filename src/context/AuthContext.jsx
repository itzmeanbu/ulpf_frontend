import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ulpf_token');
    if (token) {
      authService
        .getCurrentUser()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('ulpf_token');
          localStorage.removeItem('ulpf_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

 const login = async (email, password) => {
  const response = await authService.login(email, password);
  const userData = { email, role: response.role };
  localStorage.setItem('ulpf_token', response.token);
  localStorage.setItem('ulpf_user', JSON.stringify(userData));
  setUser(userData);
  return response;
};
  const register = async (name, email, password) => {
    const response = await authService.register(name, email, password);
    localStorage.setItem('ulpf_token', response.token);
    localStorage.setItem('ulpf_user', JSON.stringify(response.user));
    setUser(response.user);
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
