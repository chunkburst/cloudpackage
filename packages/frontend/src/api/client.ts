import { useAuthStore } from '@/stores/auth.store';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiClient<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.method && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const auth = useAuthStore();
    if (auth.token) {
      headers.set('Authorization', `Bearer ${auth.token}`);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401) {
    const auth = useAuthStore();
    auth.logout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  return json as T;
}
