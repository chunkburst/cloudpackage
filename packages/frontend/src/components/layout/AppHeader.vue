<template>
  <header class="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4 shrink-0">
    <div class="flex items-center gap-3">
      <button
        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
        @click="$emit('toggleSidebar')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <router-link to="/" class="flex items-center gap-2 font-bold text-lg text-primary-600">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>
        CloudPackage
      </router-link>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        @click="theme.toggleDark()"
      >
        <svg v-if="!theme.isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      <div v-if="auth.isLoggedIn" class="relative group">
        <button class="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <span class="text-sm font-medium">{{ auth.user?.username }}</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <router-link to="/settings" class="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg">
            {{ $t('settings.profile') }}
          </router-link>
          <button
            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
            @click="auth.logout()"
          >
            {{ $t('auth.logout') }}
          </button>
        </div>
      </div>
      <template v-else>
        <router-link to="/login" class="btn-secondary text-sm">{{ $t('auth.login') }}</router-link>
        <router-link to="/register" class="btn-primary text-sm">{{ $t('auth.register') }}</router-link>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

defineEmits<{ toggleSidebar: [] }>();

const auth = useAuthStore();
const theme = useThemeStore();
</script>
