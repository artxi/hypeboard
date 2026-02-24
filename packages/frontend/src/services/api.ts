import type {
  Board,
  CreateBoardResponse,
  BoardResponse,
  AccessRequest,
  ApiError,
} from '../types/board';
import type { LoginDto, RegisterDto, AuthResponse, User } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          message: data.message || 'An error occurred',
          statusCode: response.status,
          error: data.error,
        };
        throw error;
      }

      return data;
    } catch (error) {
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      } as ApiError;
    }
  }

  async createBoard(
    name: string,
    createdBy: string
  ): Promise<CreateBoardResponse> {
    return this.request<CreateBoardResponse>('/boards', {
      method: 'POST',
      body: JSON.stringify({ name, createdBy }),
    });
  }

  async getBoardBySlug(
    slug: string,
    username?: string
  ): Promise<Board> {
    const params = username ? `?username=${encodeURIComponent(username)}` : '';
    return this.request<Board>(`/boards/${slug}${params}`);
  }

  async getBoardByInviteCode(code: string): Promise<Partial<Board>> {
    return this.request<Partial<Board>>(`/boards/invite/${code}`);
  }

  async requestAccess(
    slug: string,
    username: string,
    message?: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/boards/${slug}/request-access`, {
      method: 'POST',
      body: JSON.stringify({ username, message }),
    });
  }

  async approveMember(
    slug: string,
    adminUsername: string,
    usernameToApprove: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/boards/${slug}/approve-member`, {
      method: 'POST',
      body: JSON.stringify({
        adminUsername,
        usernameToApprove,
      }),
    });
  }

  async denyRequest(
    slug: string,
    adminUsername: string,
    usernameToDeny: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/boards/${slug}/deny-request`, {
      method: 'POST',
      body: JSON.stringify({
        adminUsername,
        usernameToDeny,
      }),
    });
  }

  async getPendingRequests(
    slug: string,
    adminUsername: string
  ): Promise<{ pendingRequests: AccessRequest[] }> {
    return this.request<{ pendingRequests: AccessRequest[] }>(
      `/boards/${slug}/pending-requests?adminUsername=${encodeURIComponent(adminUsername)}`
    );
  }

  // Auth endpoints
  async register(dto: RegisterDto): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getUserBoards(username: string): Promise<Board[]> {
    return this.request<Board[]>(`/boards?username=${encodeURIComponent(username)}`);
  }
}

export const api = new ApiClient();
