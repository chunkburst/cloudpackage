<template>
  <div class="h-screen flex flex-col">
    <AppHeader @toggle-sidebar="ui.toggleSidebar()" />
    <div class="flex-1 flex min-h-0">
      <AppSidebar :open="ui.sidebarOpen" @close="ui.sidebarOpen = false" />
      <main class="flex-1 min-w-0 overflow-auto p-6">
        <h1 class="text-xl font-bold mb-6">Admin</h1>
        <router-view />
      </main>
    </div>
    <AppFooter />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import Toast from '@/components/common/Toast.vue';

const ui = useUiStore();
</script>
