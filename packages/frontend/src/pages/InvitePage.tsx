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
  const { username, setUsername } = useUser();

  const [board, setBoard] = useState<Partial<Board> | null>(null);
  const [usernameInput, setUsernameInput] = useState(user?.username || username || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!board || !usernameInput.trim()) {
      setError('Please enter a username');
      return;
    }

    // Check if user is already a member (if member data is available)
    if (
      (board.members && board.members.includes(usernameInput)) ||
      (board.admins && board.admins.includes(usernameInput))
    ) {
      setUsername(usernameInput);
      navigate(`/board/${board.slug}`);
      return;
    }

    setRequesting(true);

    try {
      await api.requestAccess(board.slug, usernameInput, message || undefined);
      setUsername(usernameInput);
      setSuccess(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to request access');
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
        {success ? (
          <div className="success-message">
            <h2>Request Sent!</h2>
            <p>
              Your access request has been sent to the board admin. You'll be able to access the
              board once they approve your request.
            </p>
            {user ? (
              <Button onClick={() => navigate('/')}>Back to Home</Button>
            ) : (
              <>
                <p className="text-muted">Log in to access your boards</p>
                <Button onClick={() => navigate('/login')}>Go to Login</Button>
              </>
            )}
          </div>
        ) : (
          <>
            <h2>Join Board</h2>

            {board && (
              <div className="board-info">
                <h3>{board.name}</h3>
                <p className="text-muted">Created by {board.createdBy}</p>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Your Username</label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                  disabled={requesting || !!user}
                  readOnly={!!user}
                />
                {user && (
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Logged in as {user.username}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="message">Message (optional)</label>
                <textarea
                  id="message"
                  className="input"
                  placeholder="Why do you want to join?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  disabled={requesting}
                />
              </div>

              <Button type="submit" loading={requesting} className="btn-full-width">
                Request Access
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
