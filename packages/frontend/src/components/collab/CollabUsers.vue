<template>
  <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
    <span v-for="user in users" :key="user.id" class="flex items-center gap-1">
      <span
        class="w-2.5 h-2.5 rounded-full"
        :style="{ backgroundColor: user.color }"
      />
      {{ user.username }}
    </span>
    <span v-if="users.length === 0">No active collaborators</span>
  </div>
</template>

<script setup lang="ts">
interface CollabUser {
  id: string;
  username: string;
  color: string;
}

defineProps<{ users: CollabUser[] }>();
</script>
