<template>
  <div class="relative inline-block text-left">
    <div @click="toggle">
      <slot name="trigger" />
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-40"
        @click="close"
      />
      <div
        v-if="open"
        class="absolute z-50 mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
        :style="position"
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const open = ref(false);

function toggle(): void {
  open.value = !open.value;
}

function close(): void {
  open.value = false;
}

defineExpose({ open, toggle, close });

const position = ref({ top: '0px', left: '0px' });
</script>
