<template>
  <div class="w-full h-full min-h-[480px] flex items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <template v-if="type === 'image'">
      <img :src="src" :alt="name" class="max-w-full max-h-full object-contain" />
    </template>

    <template v-else-if="type === 'video'">
      <video :src="src" controls class="max-w-full max-h-full">
        {{ $t('preview.videoUnsupported') }}
      </video>
    </template>

    <template v-else-if="type === 'audio'">
      <div class="w-full text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <p class="mb-4 text-sm font-medium text-gray-700 dark:text-gray-200">{{ name }}</p>
        <audio :src="src" controls class="w-full max-w-md mx-auto">
          {{ $t('preview.audioUnsupported') }}
        </audio>
      </div>
    </template>

    <template v-else-if="type === 'pdf'">
      <iframe :src="src" class="w-full h-full min-h-[70vh] border-0" />
    </template>

    <template v-else-if="type === 'code'">
      <pre class="w-full h-full min-h-[70vh] overflow-auto bg-gray-950 p-5 text-sm leading-6 text-gray-100"><code>{{ content }}</code></pre>
    </template>

    <template v-else>
      <div class="max-w-md text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ $t('preview.unavailable') }}</p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ reason || $t('preview.downloadInstead') }}</p>
        <button class="btn-primary mt-5" @click="$emit('download')">{{ $t('file.download') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'unsupported';
  src: string;
  name: string;
  content?: string;
  reason?: string;
}>();

defineEmits<{ download: [] }>();
</script>
