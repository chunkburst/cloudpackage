// API request/response DTOs and standardized envelope

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'admin' | 'user' | 'viewer';
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'viewer';
  storage_quota: number;
  used_storage: number;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  authMethod?: 'jwt' | 'apikey';
}
