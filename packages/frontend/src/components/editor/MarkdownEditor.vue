<template>
  <div class="h-full flex flex-col">
    <EditorToolbar
      :file-name="fileName"
      :is-dirty="isDirty"
      :is-saving="isSaving"
      @save="$emit('save')"
      @toggle-preview="splitView = !splitView"
      @toggle-fullscreen="fullscreen = !fullscreen"
      @export="$emit('export')"
    />

    <div class="flex-1 min-h-0" :class="{ 'flex': splitView }">
      <div :class="splitView ? 'w-1/2 overflow-auto border-r border-gray-200 dark:border-gray-700' : 'h-full'">
        <textarea
          ref="editorRef"
          :value="modelValue"
          class="w-full h-full resize-none p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none"
          :class="{ 'border-0': !splitView }"
          placeholder="Start writing..."
          @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @keydown.tab.prevent="insertTab"
        />
      </div>
      <div
        v-if="splitView"
        class="w-1/2 overflow-auto p-4 prose dark:prose-invert prose-sm max-w-none"
        v-html="renderedHtml"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import EditorToolbar from './EditorToolbar.vue';

const props = defineProps<{
  modelValue: string;
  fileName: string;
  isDirty: boolean;
  isSaving: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: string];
  save: [];
  export: [];
}>();

const splitView = ref(true);
const fullscreen = ref(false);
const editorRef = ref<HTMLTextAreaElement | null>(null);

const renderedHtml = computed(() => {
  // Simple Markdown→HTML conversion for preview (Vditor handles this in production)
  const text = props.modelValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>');
});

function insertTab(e: KeyboardEvent): void {
  const ta = e.target as HTMLTextAreaElement;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  void start; void end;
  document.execCommand('insertText', false, '\t');
}
</script>
