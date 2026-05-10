<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium">Tasks</h3>
      <button class="btn-primary !text-xs" @click="$emit('create')">+ New Task</button>
    </div>

    <div class="space-y-2">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div>
          <p class="text-sm font-medium">{{ task.name }}</p>
          <p class="text-xs text-gray-400">
            {{ task.task_type }} &middot; {{ task.cron_expression }}
            <span v-if="task.last_run_at"> &middot; Last: {{ new Date(task.last_run_at).toLocaleString() }}</span>
          </p>
        </div>
        <div class="flex items-center gap-1">
          <span
            class="text-xs px-1.5 py-0.5 rounded"
            :class="task.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'"
          >
            {{ task.is_active ? 'Active' : 'Paused' }}
          </span>
          <button class="btn-secondary !text-xs !py-1 !px-2" @click="$emit('run', task.id)">Run</button>
          <button class="btn-secondary !text-xs !py-1 !px-2" @click="$emit('edit', task.id)">Edit</button>
          <button class="btn-secondary !text-xs !py-1 !px-2 text-red-500" @click="$emit('delete', task.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Task {
  id: string;
  name: string;
  task_type: string;
  cron_expression: string;
  is_active: number;
  last_run_at: string | null;
  last_run_status: string | null;
}

defineProps<{ tasks: Task[] }>();
defineEmits<{
  create: [];
  run: [id: string];
  edit: [id: string];
  delete: [id: string];
}>();
</script>
