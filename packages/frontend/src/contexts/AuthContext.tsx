import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User, LoginDto, RegisterDto, AuthResponse } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          // Decode token to check if it's expired
          const decoded: any = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;

          if (decoded.exp && decoded.exp < currentTime) {
            // Token expired
            localStorage.removeItem('auth_token');
            setLoading(false);
            return;
          }

          // Token valid, fetch user info
          setToken(storedToken);
          const userData = await api.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to validate token:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (dto: LoginDto) => {
    const response: AuthResponse = await api.login(dto);
    localStorage.setItem('auth_token', response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
  };

  const register = async (dto: RegisterDto) => {
    const response: AuthResponse = await api.register(dto);
    localStorage.setItem('auth_token', response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
