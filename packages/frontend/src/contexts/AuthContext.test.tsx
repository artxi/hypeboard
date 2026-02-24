import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
  },
}));

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  default: vi.fn((token: string) => {
    if (token === 'expired.token') {
      return { exp: Date.now() / 1000 - 1000 }; // Expired token
    }
    if (token === 'valid.token') {
      return { exp: Date.now() / 1000 + 3600 }; // Valid token (1 hour from now)
    }
    throw new Error('Invalid token');
  }),
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, token, login, register, logout, loading } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.username : 'no user'}</div>
      <div data-testid="token">{token || 'no token'}</div>
      <button onClick={() => login({ username: 'testuser', password: 'pass' })}>
        Login
      </button>
      <button onClick={() => register({ username: 'newuser', password: 'pass' })}>
        Register
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should store token and update user state', async () => {
      const mockResponse = {
        accessToken: 'test.jwt.token',
        user: {
          username: 'testuser',
          boardSlugs: ['board1'],
        },
      };

      vi.mocked(api.api.login).mockResolvedValue(mockResponse);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Click login button
      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
        expect(screen.getByTestId('token')).toHaveTextContent('test.jwt.token');
        expect(localStorage.getItem('auth_token')).toBe('test.jwt.token');
      });
    });
  });

  describe('register', () => {
    it('should store token and update user state', async () => {
      const mockResponse = {
        accessToken: 'new.jwt.token',
        user: {
          username: 'newuser',
          boardSlugs: [],
        },
      };

      vi.mocked(api.api.register).mockResolvedValue(mockResponse);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      const registerButton = screen.getByText('Register');
      await act(async () => {
        registerButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('newuser');
        expect(screen.getByTestId('token')).toHaveTextContent('new.jwt.token');
        expect(localStorage.getItem('auth_token')).toBe('new.jwt.token');
      });
    });
  });

  describe('logout', () => {
    it('should clear token and user state', async () => {
      localStorage.setItem('auth_token', 'valid.token');

      vi.mocked(api.api.getMe).mockResolvedValue({
        username: 'testuser',
        boardSlugs: ['board1'],
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });

      // Click logout
      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
        expect(screen.getByTestId('token')).toHaveTextContent('no token');
        expect(localStorage.getItem('auth_token')).toBeNull();
      });
    });
  });

  describe('token restoration on mount', () => {
    it('should restore valid token from localStorage', async () => {
      localStorage.setItem('auth_token', 'valid.token');

      vi.mocked(api.api.getMe).mockResolvedValue({
        username: 'restoreduser',
        boardSlugs: ['board1'],
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('user')).toHaveTextContent('restoreduser');
        expect(screen.getByTestId('token')).toHaveTextContent('valid.token');
      });
    });
  });

  describe('token expiration', () => {
    it('should remove expired token from localStorage', async () => {
      localStorage.setItem('auth_token', 'expired.token');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
        expect(screen.getByTestId('token')).toHaveTextContent('no token');
        expect(localStorage.getItem('auth_token')).toBeNull();
      });
    });
  });

  describe('token validation failure', () => {
    it('should clear invalid token', async () => {
      localStorage.setItem('auth_token', 'valid.token');

      vi.mocked(api.api.getMe).mockRejectedValue(new Error('Unauthorized'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(localStorage.getItem('auth_token')).toBeNull();
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });
});
