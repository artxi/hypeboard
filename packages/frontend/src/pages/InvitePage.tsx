import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { Board, ApiError } from '../types/board';

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { username } = useUser();

  const [board, setBoard] = useState<Partial<Board> | null>(null);
  const [usernameInput, setUsernameInput] = useState(user?.username || username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill username if user is logged in
  useEffect(() => {
    if (user) {
      setUsernameInput(user.username);
    }
  }, [user]);

  useEffect(() => {
    const fetchBoard = async () => {
      if (!code) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const boardData = await api.getBoardByInviteCode(code);
        setBoard(boardData);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load board');
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [code]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    if (!board || !code) {
      setError('Invalid invite link');
      return;
    }

    // Validate inputs
    if (usernameInput.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setRequesting(true);

    try {
      const response = await api.registerViaInvite({
        username: usernameInput.trim(),
        password,
        inviteCode: code,
      });

      // Store auth token
      localStorage.setItem('auth_token', response.accessToken);

      // Force page navigation to trigger AuthContext refresh
      window.location.href = `/boards/${response.boardSlug}`;
    } catch (err) {
      const apiError = err as ApiError;

      if (apiError.message?.includes('already a member')) {
        setError('You already have access to this board. Redirecting...');
        setTimeout(() => navigate(`/boards/${board.slug}`), 1000);
      } else if (apiError.message?.includes('Username already exists')) {
        setError('Username is already taken. Please choose another.');
      } else {
        setError(apiError.message || 'Failed to create account');
      }
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <Card>
          <div className="loading">Loading board information...</div>
        </Card>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="container">
        <Card>
          <div className="error-message">{error}</div>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container">
      <Card>
        {!user ? (
          // Registration form for non-authenticated users
          <>
            <h2>Create Account & Join Board</h2>

            {board && (
              <div className="board-info">
                <h3>{board.name}</h3>
                <p className="text-muted">Created by {board.createdBy}</p>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                  disabled={requesting}
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={requesting}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={requesting}
                />
                {passwordError && (
                  <span className="error-message" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {passwordError}
                  </span>
                )}
              </div>

              <Button type="submit" loading={requesting} className="btn-full-width">
                {requesting ? 'Creating Account...' : 'Create Account & Join'}
              </Button>

              <div className="text-muted" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                Already have an account?{' '}
                <a href="/login" style={{ color: 'var(--accent)' }}>
                  Login here
                </a>
              </div>
            </form>
          </>
        ) : (
          // For authenticated users, show simple join button
          <>
            <h2>Join Board</h2>

            {board && (
              <div className="board-info">
                <h3>{board.name}</h3>
                <p className="text-muted">Created by {board.createdBy}</p>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <p className="text-muted">You're logged in as <strong>{user.username}</strong></p>

            <Button
              onClick={() => navigate(`/boards/${board?.slug}`)}
              className="btn-full-width"
            >
              Go to Board
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
