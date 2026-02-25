import type {
  Board,
  CreateBoardResponse,
  AccessRequest,
  ApiError,
  Sound,
} from '../types/board';
import type {
  LoginDto,
  RegisterDto,
  AuthResponse,
  User,
  RegisterViaInviteDto,
  RegisterViaInviteResponse,
} from '../types/auth';
import type { UserPreferences } from '../types/preferences';

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

  async registerViaInvite(dto: RegisterViaInviteDto): Promise<RegisterViaInviteResponse> {
    return this.request<RegisterViaInviteResponse>('/auth/register-via-invite', {
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

  // Sound endpoints
  async uploadSound(
    boardId: string,
    file: File,
    metadata: {
      name: string;
      emoji?: string;
      imageUrl?: string;
      imageFile?: File;
      globalVolume?: number;
      startTime?: number;
      endTime?: number;
    }
  ): Promise<Sound> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    if (metadata.emoji) {
      formData.append('emoji', metadata.emoji);
    }
    if (metadata.imageUrl) {
      formData.append('imageUrl', metadata.imageUrl);
    }
    if (metadata.imageFile) {
      formData.append('imageFile', metadata.imageFile);
    }
    if (metadata.globalVolume !== undefined) {
      formData.append('globalVolume', metadata.globalVolume.toString());
    }
    if (metadata.startTime !== undefined) {
      formData.append('startTime', metadata.startTime.toString());
    }
    if (metadata.endTime !== undefined) {
      formData.append('endTime', metadata.endTime.toString());
    }

    const token = localStorage.getItem('auth_token');
    const url = `${API_URL}/boards/${boardId}/sounds`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        message: data.message || 'Upload failed',
        statusCode: response.status,
        error: data.error,
      };
      throw error;
    }

    return data;
  }

  async getSounds(boardId: string, username?: string): Promise<Sound[]> {
    const params = username ? `?username=${encodeURIComponent(username)}` : '';
    return this.request<Sound[]>(`/boards/${boardId}/sounds${params}`);
  }

  getSoundStreamUrl(soundId: string, username: string): string {
    return `${API_URL}/sounds/${soundId}/stream?username=${encodeURIComponent(username)}`;
  }

  getSoundImageUrl(soundId: string): string {
    return `${API_URL}/sounds/${soundId}/image`;
  }

  async updateSound(
    soundId: string,
    data: {
      name?: string;
      emoji?: string;
      imageUrl?: string;
    }
  ): Promise<Sound> {
    return this.request<Sound>(`/sounds/${soundId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async trimSound(
    soundId: string,
    startTime: number,
    endTime: number,
    username: string
  ): Promise<Sound> {
    return this.request<Sound>(`/sounds/${soundId}/trim`, {
      method: 'PUT',
      body: JSON.stringify({ startTime, endTime, username }),
    });
  }

  async deleteSound(soundId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sounds/${soundId}`, {
      method: 'DELETE',
    });
  }

  // User Preferences endpoints
  async getUserPreferences(boardId: string): Promise<UserPreferences> {
    return this.request<UserPreferences>(`/user-preferences/${boardId}`);
  }

  async updateSoundPreference(
    soundId: string,
    boardId: string,
    data: {
      volume?: number;
      isFavorite?: boolean;
    }
  ): Promise<UserPreferences> {
    return this.request<UserPreferences>(`/user-preferences/${soundId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, boardId }),
    });
  }

  async getFavorites(boardId: string): Promise<{ favorites: string[] }> {
    return this.request<{ favorites: string[] }>(`/user-preferences/${boardId}/favorites`);
  }
}

export const api = new ApiClient();
