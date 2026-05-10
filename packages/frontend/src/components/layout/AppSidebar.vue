<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-14 transition-transform lg:translate-x-0 lg:static lg:z-auto',
      open ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <nav class="p-3 space-y-1">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
               text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700
               transition-colors"
        active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
      >
        <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div v-if="auth.isAdmin" class="border-t border-gray-200 dark:border-gray-700 mx-3 pt-3 mt-3">
      <p class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{{ $t('nav.admin') }}</p>
      <router-link
        v-for="item in adminItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
               text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700
               transition-colors"
        active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
      >
        <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span>{{ item.label }}</span>
      </router-link>
    </div>
  </aside>

  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-black/30 lg:hidden"
    @click="$emit('close')"
  />
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';

defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();

const { t } = useI18n();
const auth = useAuthStore();

function icon(path: string) {
  return {
    render() {
      return h('svg', {
        class: 'w-5 h-5 flex-shrink-0',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
        innerHTML: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${path}" />`,
      });
    },
  };
}

const FolderIcon = icon('M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z');
const SearchIcon = icon('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z');
const SettingsIcon = icon('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z');
const UsersIcon = icon('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z');
const StorageIcon = icon('M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6');

const navItems = computed(() => [
  { to: '/files', label: t('nav.files'), icon: FolderIcon },
  { to: '/search', label: t('nav.search'), icon: SearchIcon },
  { to: '/settings', label: t('nav.settings'), icon: SettingsIcon },
]);

const adminItems = computed(() => [
  { to: '/admin', label: t('admin.dashboard'), icon: SettingsIcon },
  { to: '/admin/users', label: t('admin.users'), icon: UsersIcon },
  { to: '/admin/storage', label: t('admin.storage'), icon: StorageIcon },
]);
</script>
