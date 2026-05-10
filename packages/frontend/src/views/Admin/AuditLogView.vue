<template>
  <div>
    <h2 class="text-lg font-semibold mb-4">{{ $t('admin.audit') }}</h2>
    <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />
    <AuditLog :entries="entries" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';
import AuditLog from '@/components/admin/AuditLog.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const entries = ref<AuditEntry[]>([]);
const error = ref('');

onMounted(async () => {
  try {
    const res = await apiClient<{ success: boolean; data: AuditEntry[] }>('/admin/audit');
    entries.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>
