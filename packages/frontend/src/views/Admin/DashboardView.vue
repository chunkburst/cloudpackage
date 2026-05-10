<template>
  <div>
    <LoadingSpinner v-if="loading" />
    <ErrorAlert v-else-if="error" :message="error" />
    <template v-else>
      <SystemStats :stats="stats" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';
import SystemStats from '@/components/admin/SystemStats.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const loading = ref(true);
const error = ref('');
const stats = ref({
  totalUsers: 0,
  totalFiles: 0,
  totalStorageBytes: 0,
  activeSessions: 0,
});

onMounted(async () => {
  try {
    const res = await apiClient<{ success: boolean; data: typeof stats.value }>('/admin/stats');
    stats.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>
