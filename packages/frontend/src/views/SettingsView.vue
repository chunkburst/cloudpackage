<template>
  <div class="h-screen flex flex-col">
    <AppHeader @toggle-sidebar="ui.toggleSidebar()" />
    <div class="flex-1 flex min-h-0">
      <AppSidebar :open="ui.sidebarOpen" @close="ui.sidebarOpen = false" />
      <main class="flex-1 min-w-0 overflow-auto p-4">
        <div class="max-w-2xl mx-auto space-y-6">
          <h2 class="text-lg font-semibold">{{ $t('settings.profile') }}</h2>

          <section class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 class="text-sm font-medium mb-3">{{ $t('settings.language') }}</h3>
            <div class="flex items-center gap-3">
              <button
                :class="ui.locale === 'zh-CN' ? 'btn-primary !text-xs' : 'btn-secondary !text-xs'"
                @click="ui.setLocale('zh-CN')"
              >中文</button>
              <button
                :class="ui.locale === 'en' ? 'btn-primary !text-xs' : 'btn-secondary !text-xs'"
                @click="ui.setLocale('en')"
              >English</button>
            </div>
          </section>

          <section class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 class="text-sm font-medium mb-3">{{ $t('settings.theme') }}</h3>
            <label class="flex items-center gap-3 cursor-pointer">
              <span class="text-sm text-gray-600 dark:text-gray-300">{{ $t('settings.darkMode') }}</span>
              <button
                class="relative w-10 h-6 rounded-full transition-colors"
                :class="theme.isDark ? 'bg-primary-600' : 'bg-gray-300'"
                @click="theme.toggleDark()"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  :class="theme.isDark ? 'translate-x-4.5 left-0.5' : 'left-0.5'"
                  :style="{ transform: theme.isDark ? 'translateX(16px)' : 'translateX(1px)' }"
                />
              </button>
            </label>
          </section>

          <section class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <ApiKeyManager />
          </section>

          <Toast />
        </div>
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store';
import { useThemeStore } from '@/stores/theme.store';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import ApiKeyManager from '@/components/auth/ApiKeyManager.vue';
import Toast from '@/components/common/Toast.vue';

const ui = useUiStore();
const theme = useThemeStore();
</script>
