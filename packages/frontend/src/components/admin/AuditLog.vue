<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
          <th class="py-2 px-3 font-medium">Time</th>
          <th class="py-2 px-3 font-medium">User</th>
          <th class="py-2 px-3 font-medium">Action</th>
          <th class="py-2 px-3 font-medium">Resource</th>
          <th class="py-2 px-3 font-medium">IP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.id" class="border-b border-gray-100 dark:border-gray-700/50">
          <td class="py-2 px-3 text-xs text-gray-500">{{ new Date(entry.created_at).toLocaleString() }}</td>
          <td class="py-2 px-3 text-xs">{{ entry.user_id || '--' }}</td>
          <td class="py-2 px-3 text-xs">{{ entry.action }}</td>
          <td class="py-2 px-3 text-xs text-gray-500">
            {{ entry.resource_type }}{{ entry.resource_id ? '/' + entry.resource_id : '' }}
          </td>
          <td class="py-2 px-3 text-xs text-gray-500">{{ entry.ip_address || '--' }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="entries.length === 0" class="text-sm text-gray-400 text-center py-8">No audit entries</p>
  </div>
</template>

<script setup lang="ts">
interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
}

defineProps<{ entries: AuditEntry[] }>();
</script>
