export interface AccessRequest {
  username: string;
  requestedAt: Date;
  message?: string;
}

export interface BoardSettings {
  maxSounds: number;
  maxFileSize: number;
  allowUploads: boolean;
}

export interface Board {
  name: string;
  slug: string;
  createdBy: string;
  admins?: string[]; // Only returned to admins
  members?: string[]; // Only returned to admins
  pendingRequests?: AccessRequest[]; // Only returned to admins
  inviteCode?: string; // Only returned to admins
  isPublic: boolean;
  settings: BoardSettings;
  lastActivity: Date;
}

export interface CreateBoardResponse {
  message: string;
  board: Board;
  inviteLink: string;
}

export interface BoardResponse {
  board: Board;
  userRole?: 'admin' | 'member' | 'none';
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
