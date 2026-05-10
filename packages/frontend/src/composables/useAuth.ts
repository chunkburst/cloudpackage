import { useAuthStore } from '@/stores/auth.store';

export function useAuth(): ReturnType<typeof useAuthStore> {
  return useAuthStore();
}
