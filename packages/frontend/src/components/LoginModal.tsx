import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

type Tab = 'login' | 'register';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onSuccess }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(loginForm);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (registerForm.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        username: registerForm.username,
        password: registerForm.password,
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-content">
        <div className="login-modal-header">
          <h1 className="login-modal-title">HYPEBOARD</h1>
          <p className="login-modal-subtitle">Your collaborative soundboard platform</p>
        </div>

        <div className="tab-container">
          <button
            className={`tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
          >
            Login
          </button>
          <button
            className={`tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
          >
            Register
          </button>
        </div>

        <div className="login-modal-body">
          {error && <div className="error-message">{error}</div>}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <Input
                label="Username"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                placeholder="Enter your username"
                required
              />
              <Input
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                placeholder="Enter your password"
                required
              />
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <Input
                label="Username"
                value={registerForm.username}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, username: e.target.value })
                }
                placeholder="Choose a username"
                required
              />
              <Input
                label="Password"
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                placeholder="Choose a password (min 6 characters)"
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="Confirm your password"
                required
              />
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
