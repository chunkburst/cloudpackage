<template>
  <select :model-value="modelValue" class="input" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
    <option value="">Default storage</option>
    <option v-for="config in configs" :key="config.id" :value="config.id">
      {{ config.name }} ({{ config.driver }}) — {{ config.mount_point }}
    </option>
  </select>
</template>

<script setup lang="ts">
interface StorageConfig {
  id: string;
  name: string;
  driver: string;
  mount_point: string;
}

defineProps<{ modelValue: string; configs: StorageConfig[] }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
