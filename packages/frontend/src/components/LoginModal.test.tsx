import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginModal } from './LoginModal';
import { AuthProvider } from '../contexts/AuthContext';
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
  default: vi.fn(() => ({ exp: Date.now() / 1000 + 3600 })),
}));

describe('LoginModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form by default', () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    expect(screen.getByText('HYPEBOARD')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
  });

  it('should switch to register form', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const registerTab = screen.getByRole('button', { name: 'Register' });
    await user.click(registerTab);

    expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Choose a password (min 6 characters)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('should call login on form submit', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.mocked(api.api.login).mockResolvedValue({
      accessToken: 'test.token',
      user: { username: 'testuser', boardSlugs: [] },
    });

    render(
      <AuthProvider>
        <LoginModal isOpen={true} onSuccess={onSuccess} />
      </AuthProvider>
    );

    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const loginButton = screen.getByRole('button', { name: 'Log In' });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(api.api.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();

    vi.mocked(api.api.login).mockRejectedValue({
      message: 'Invalid credentials',
      statusCode: 401,
    });

    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const loginButton = screen.getByRole('button', { name: 'Log In' });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should call register on form submit', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.mocked(api.api.register).mockResolvedValue({
      accessToken: 'new.token',
      user: { username: 'newuser', boardSlugs: [] },
    });

    render(
      <AuthProvider>
        <LoginModal isOpen={true} onSuccess={onSuccess} />
      </AuthProvider>
    );

    // Switch to register tab
    const registerTab = screen.getByRole('button', { name: 'Register' });
    await user.click(registerTab);

    const usernameInput = screen.getByPlaceholderText('Choose a username');
    const passwordInput = screen.getByPlaceholderText('Choose a password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
    const registerButton = screen.getByRole('button', { name: 'Create Account' });

    await user.type(usernameInput, 'newuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(registerButton);

    await waitFor(() => {
      expect(api.api.register).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password123',
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should validate password match on register', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    // Switch to register tab
    const registerTab = screen.getByRole('button', { name: 'Register' });
    await user.click(registerTab);

    const usernameInput = screen.getByPlaceholderText('Choose a username');
    const passwordInput = screen.getByPlaceholderText('Choose a password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
    const registerButton = screen.getByRole('button', { name: 'Create Account' });

    await user.type(usernameInput, 'newuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentpassword');
    await user.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(api.api.register).not.toHaveBeenCalled();
    });
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AuthProvider>
        <LoginModal isOpen={false} />
      </AuthProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
