<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-[60] min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1"
      :style="{ top: y + 'px', left: x + 'px' }"
      @click.self="close"
    >
      <button
        v-for="item in items"
        :key="item.action"
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
        :class="{ 'text-red-600': item.danger }"
        @click="item.handler(); close()"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

interface ContextMenuItem {
  label: string;
  action: string;
  handler: () => void;
  danger?: boolean;
}

defineProps<{ items: ContextMenuItem[] }>();

const visible = ref(false);
const x = ref(0);
const y = ref(0);

function show(event: MouseEvent): void {
  x.value = event.clientX;
  y.value = event.clientY;
  visible.value = true;
  document.addEventListener('click', close, { once: true });
  document.addEventListener('keydown', onEsc);
}

function close(): void {
  visible.value = false;
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') close();
}

onUnmounted(() => {
  document.removeEventListener('keydown', onEsc);
});

defineExpose({ show, close });
</script>
