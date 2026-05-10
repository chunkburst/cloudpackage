<template>
  <div
    v-for="cursor in cursors"
    :key="cursor.userId"
    class="absolute pointer-events-none z-10"
    :style="{
      left: cursor.x + 'px',
      top: cursor.y + 'px',
    }"
  >
    <div
      class="w-0.5 h-5 bg-current animate-pulse"
      :style="{ backgroundColor: cursor.color }"
    />
    <span
      class="absolute -top-4 left-1 text-xs px-1 py-0.5 rounded whitespace-nowrap"
      :style="{ backgroundColor: cursor.color, color: '#fff' }"
    >
      {{ cursor.username }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface CollabCursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

defineProps<{ cursors: CollabCursor[] }>();
</script>
