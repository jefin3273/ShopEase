import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

type User = { id: string; name: string; email: string; role?: string } | null;

type AuthContextType = {
  user: User;
  accessToken: string | null;
  // return the user object on success so callers can react immediately (e.g. redirect)
  login: (email: string, password: string) => Promise<User | void>;
  register: (name: string, email: string, password: string, adminSecret?: string) => Promise<User | void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // attempt to refresh on mount to populate accessToken if refresh cookie exists
    (async () => {
      try {
        const res = await api.post('/api/auth/refresh');
        setAccessToken(res.data.accessToken);
        if (res.data.accessToken) api.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.accessToken;
        if (res.data.user) setUser(res.data.user);
      } catch (e) {
        // no session
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    if (res.data.accessToken) {
      api.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.accessToken;
      localStorage.setItem('token', res.data.accessToken);
    }
    if (res.data.user) setUser(res.data.user);
    // Trigger cart sync by dispatching event
    window.dispatchEvent(new Event('user-login'));
    return res.data.user as User;
  };

  const register = async (name: string, email: string, password: string, adminSecret?: string) => {
    const body: { name: string; email: string; password: string; adminSecret?: string } = { name, email, password };
    if (adminSecret) body.adminSecret = adminSecret;
    const res = await api.post('/api/auth/register', body);
    setAccessToken(res.data.accessToken);
    if (res.data.accessToken) {
      api.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.accessToken;
      localStorage.setItem('token', res.data.accessToken);
    }
    if (res.data.user) setUser(res.data.user);
    // Trigger cart sync by dispatching event
    window.dispatchEvent(new Event('user-login'));
    return res.data.user as User;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setAccessToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    // Dispatch logout event to clear cart
    window.dispatchEvent(new Event('user-logout'));
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, register, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
