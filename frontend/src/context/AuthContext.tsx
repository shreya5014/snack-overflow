import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types/auth.js';
import { loginApi, fetchMe } from '../api/snacks.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickDemoLogin: (role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('snack_token');
    const storedUser = localStorage.getItem('snack_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token in background
        fetchMe()
          .then((verifiedUser) => {
            setUser(verifiedUser);
            localStorage.setItem('snack_user', JSON.stringify(verifiedUser));
          })
          .catch(() => {
            logout();
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      } catch {
        logout();
      }
    }
    setLoading(false);

    const handleAuthLogout = () => logout();
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await loginApi(email, password);
    setToken(authData.token);
    setUser(authData.user);
    localStorage.setItem('snack_token', authData.token);
    localStorage.setItem('snack_user', JSON.stringify(authData.user));
  };

  const quickDemoLogin = async (role: Role) => {
    if (role === 'ADMIN') {
      await login('admin@snackoverflow.local', 'AdminPass123!');
    } else {
      await login('member@snackoverflow.local', 'MemberPass123!');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('snack_token');
    localStorage.removeItem('snack_user');
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'ADMIN',
    isMember: user?.role === 'MEMBER',
    loading,
    login,
    quickDemoLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
