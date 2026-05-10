import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AuthUser } from '@cloudpackage/shared/types';
import { apiClient } from '@/api/client';

interface LoginResponse {
  success: boolean;
  data: { token: string; user: AuthUser };
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string;
  created_at: string;
  expires_at: string | null;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  function restore(): void {
    const saved = localStorage.getItem('auth');
    if (saved) {
      try {
        const { token: t, user: u } = JSON.parse(saved);
        token.value = t;
        user.value = u;
      } catch {
        localStorage.removeItem('auth');
      }
    }
  }

  function persist(): void {
    localStorage.setItem('auth', JSON.stringify({ token: token.value, user: user.value }));
  }

  async function login(username: string, password: string): Promise<void> {
    const res = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuth: true,
    });
    token.value = res.data.token;
    user.value = res.data.user;
    persist();
  }

  async function register(username: string, email: string, password: string): Promise<void> {
    const res = await apiClient<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
      skipAuth: true,
    });
    token.value = res.data.token;
    user.value = res.data.user;
    persist();
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem('auth');
  }

  async function refresh(): Promise<void> {
    const res = await apiClient<LoginResponse>('/auth/refresh', { method: 'POST' });
    token.value = res.data.token;
    user.value = res.data.user;
    persist();
  }

  async function fetchApiKeys(): Promise<ApiKey[]> {
    const res = await apiClient<{ success: boolean; data: ApiKey[] }>('/auth/api-keys');
    return res.data;
  }

  async function createApiKey(name: string): Promise<{ id: string; name: string; key: string }> {
    const res = await apiClient<{ success: boolean; data: { id: string; name: string; key: string } }>(
      '/auth/api-keys',
      { method: 'POST', body: JSON.stringify({ name }) }
    );
    return res.data;
  }

  async function revokeApiKey(keyId: string): Promise<void> {
    await apiClient(`/auth/api-keys/${keyId}`, { method: 'DELETE' });
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    restore,
    login,
    register,
    logout,
    refresh,
    fetchApiKeys,
    createApiKey,
    revokeApiKey,
  };
});
