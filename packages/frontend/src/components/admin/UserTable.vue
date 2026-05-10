<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <input
        v-model="search"
        type="text"
        class="input w-64"
        placeholder="Search users..."
        @input="$emit('search', search)"
      />
      <button class="btn-primary !text-xs" @click="$emit('create')">+ Add User</button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
            <th class="py-2 px-3 font-medium">Username</th>
            <th class="py-2 px-3 font-medium">Email</th>
            <th class="py-2 px-3 font-medium">Role</th>
            <th class="py-2 px-3 font-medium">Storage</th>
            <th class="py-2 px-3 font-medium">Status</th>
            <th class="py-2 px-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="py-2 px-3 font-medium">{{ user.username }}</td>
            <td class="py-2 px-3 text-xs text-gray-500">{{ user.email }}</td>
            <td class="py-2 px-3">
              <span :class="roleBadge(user.role)">{{ user.role }}</span>
            </td>
            <td class="py-2 px-3 text-xs text-gray-500">{{ formatSize(user.used_storage) }} / {{ formatSize(user.storage_quota) }}</td>
            <td class="py-2 px-3">
              <span :class="user.is_active ? 'text-green-500' : 'text-red-500'">
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="py-2 px-3">
              <div class="flex items-center gap-1">
                <button class="text-xs text-primary-500 hover:text-primary-700" @click="$emit('edit', user.id)">Edit</button>
                <button class="text-xs text-red-500 hover:text-red-700" @click="$emit('delete', user.id)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="users.length === 0" class="text-sm text-gray-400 text-center py-8">No users found</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  storage_quota: number;
  used_storage: number;
  is_active: number;
}

defineProps<{ users: User[] }>();
defineEmits<{
  search: [query: string];
  create: [];
  edit: [id: string];
  delete: [id: string];
}>();

const search = ref('');

function roleBadge(role: string): string {
  return role === 'admin'
    ? 'text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded'
    : 'text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded';
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
</script>
