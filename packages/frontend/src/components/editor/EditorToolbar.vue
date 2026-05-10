<template>
  <div class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <span class="text-sm font-medium truncate max-w-[200px]">{{ fileName }}</span>

    <span v-if="isDirty" class="text-xs text-yellow-500">&#9679;</span>
    <span v-if="isSaving" class="text-xs text-blue-500">{{ $t('editor.saving') }}</span>

    <div class="flex items-center gap-1 ml-auto">
      <button
        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
        :title="$t(splitViewActive ? 'editor.fullscreen' : 'editor.preview')"
        @click="$emit('togglePreview')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="splitViewActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 5a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5zm9 2v5" />
        </svg>
      </button>

      <button
        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
        :title="$t('editor.export')"
        @click="$emit('export')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      <button
        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-primary-600"
        @click="$emit('save')"
      >
        {{ $t('editor.save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  fileName: string;
  isDirty: boolean;
  isSaving: boolean;
  splitViewActive?: boolean;
}>(), { splitViewActive: true });

defineEmits<{
  save: [];
  togglePreview: [];
  toggleFullscreen: [];
  export: [];
}>();
</script>
