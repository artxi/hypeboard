export interface User {
  username: string;
  boardSlugs: string[];
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterViaInviteDto {
  username: string;
  password: string;
  inviteCode: string;
}

export interface RegisterViaInviteResponse {
  accessToken: string;
  user: User;
  boardSlug: string;
}
