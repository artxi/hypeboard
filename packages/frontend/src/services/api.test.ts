import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from './api';
import type { ApiError } from '../types/board';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Auth headers', () => {
    it('should include Bearer token when token exists', async () => {
      localStorage.setItem('auth_token', 'test.token');

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ username: 'testuser' }),
      } as Response);

      await api.getMe();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test.token',
          }),
        })
      );
    });

    it('should not include auth header without token', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'token', user: {} }),
      } as Response);

      await api.login({ username: 'user', password: 'pass' });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0][1];
      expect(fetchCall?.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError with statusCode on API error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized', error: 'Unauthorized' }),
      } as Response);

      try {
        await api.getMe();
        expect.fail('Should have thrown error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBe(401);
        expect(apiError.message).toBe('Unauthorized');
      }
    });

    it('should throw network error on fetch failure', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network failure'));

      try {
        await api.getMe();
        expect.fail('Should have thrown error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBe(0);
        expect(apiError.message).toContain('Network error');
      }
    });
  });

  describe('login', () => {
    it('should call POST /auth/login with credentials', async () => {
      const mockResponse = {
        accessToken: 'test.token',
        user: { username: 'testuser', boardSlugs: [] },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.login({ username: 'testuser', password: 'pass123' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', password: 'pass123' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('register', () => {
    it('should call POST /auth/register with credentials', async () => {
      const mockResponse = {
        accessToken: 'test.token',
        user: { username: 'newuser', boardSlugs: [] },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.register({ username: 'newuser', password: 'pass123' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'newuser', password: 'pass123' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createBoard', () => {
    it('should call POST /boards with auth header', async () => {
      localStorage.setItem('auth_token', 'test.token');

      const mockResponse = {
        board: {
          _id: 'board123',
          name: 'Test Board',
          slug: 'test-board',
          createdBy: 'testuser',
          admins: ['testuser'],
          members: ['testuser'],
          inviteCode: 'ABC123',
          settings: {},
        },
        inviteLink: 'http://localhost:5173/invite/ABC123',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.createBoard('Test Board', 'testuser');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/boards',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test.token',
          }),
          body: JSON.stringify({ name: 'Test Board', createdBy: 'testuser' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('requestAccess', () => {
    it('should call POST /boards/:slug/request-access', async () => {
      localStorage.setItem('auth_token', 'test.token');

      const mockResponse = {
        message: 'Access request submitted successfully',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.requestAccess('test-board', 'testuser', 'Please approve');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/boards/test-board/request-access',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', message: 'Please approve' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('approveMember', () => {
    it('should call POST /boards/:slug/approve-member', async () => {
      localStorage.setItem('auth_token', 'admin.token');

      const mockResponse = {
        message: 'Member approved successfully',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.approveMember('test-board', 'admin', 'newmember');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/boards/test-board/approve-member',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ adminUsername: 'admin', usernameToApprove: 'newmember' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('denyRequest', () => {
    it('should call POST /boards/:slug/deny-request', async () => {
      localStorage.setItem('auth_token', 'admin.token');

      const mockResponse = {
        message: 'Access request denied',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.denyRequest('test-board', 'admin', 'denyuser');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/boards/test-board/deny-request',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ adminUsername: 'admin', usernameToDeny: 'denyuser' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
