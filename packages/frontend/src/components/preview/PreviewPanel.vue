<template>
  <div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-950 rounded-lg overflow-hidden">
    <!-- Image Preview -->
    <template v-if="type === 'image'">
      <img :src="src" :alt="name" class="max-w-full max-h-full object-contain" />
    </template>

    <!-- Video Preview -->
    <template v-else-if="type === 'video'">
      <video :src="src" controls class="max-w-full max-h-full">
        Your browser does not support the video tag.
      </video>
    </template>

    <!-- Audio Preview -->
    <template v-else-if="type === 'audio'">
      <div class="text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <audio :src="src" controls class="w-full max-w-md mx-auto">
          Your browser does not support the audio tag.
        </audio>
      </div>
    </template>

    <!-- PDF Preview -->
    <template v-else-if="type === 'pdf'">
      <iframe :src="src" class="w-full h-full border-0" />
    </template>

    <!-- Code Preview -->
    <template v-else-if="type === 'code'">
      <pre class="w-full h-full p-4 overflow-auto text-sm"><code>{{ content }}</code></pre>
    </template>

    <!-- Office/Ebook preview via iframe -->
    <template v-else-if="type === 'office' || type === 'ebook'">
      <iframe :src="src" class="w-full h-full border-0">
        Preview not available
      </iframe>
    </template>

    <!-- Unsupported -->
    <template v-else>
      <div class="text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-gray-500">Preview not available for this file type.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'office' | 'ebook' | 'unsupported';
  src: string;
  name: string;
  content?: string;
}>();
</script>
