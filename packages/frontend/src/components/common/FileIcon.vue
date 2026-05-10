<template>
  <span :class="iconClass" :title="mimeType">
    {{ icon }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  mimeType: string;
  size?: 'sm' | 'md' | 'lg';
  isDirectory?: boolean;
}>(), { size: 'md', isDirectory: false });

const sizeClass = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }[props.size];

const icon = computed(() => {
  if (props.isDirectory) return '\u{1F4C1}';
  const type = props.mimeType;
  if (type.startsWith('image/')) return '\u{1F5BC}';
  if (type.startsWith('video/')) return '\u{1F3AC}';
  if (type.startsWith('audio/')) return '\u{1F3B5}';
  if (type.includes('pdf')) return '\u{1F4C4}';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gzip'))
    return '\u{1F4E6}';
  if (type.startsWith('text/') || type.includes('markdown') || type.includes('json') || type.includes('javascript') || type.includes('typescript'))
    return '\u{1F4DD}';
  return '\u{1F4C4}';
});

const iconClass = computed(() => `${sizeClass} inline-flex items-center justify-center`);
</script>
