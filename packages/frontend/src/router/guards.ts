import type { Router } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

export function registerGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();

    if (to.meta.requiresAuth && !auth.token) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (to.meta.guest && auth.token) {
      return { name: 'files' };
    }

    if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
      return { name: 'files' };
    }

    // Restore session from localStorage on first navigation
    if (!auth.token) {
      auth.restore();
    }

    return true;
  });
}
