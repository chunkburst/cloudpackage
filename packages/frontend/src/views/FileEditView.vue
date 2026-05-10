<template>
  <div class="h-screen flex flex-col">
    <div class="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 gap-3 shrink-0">
      <router-link to="/files" class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </router-link>
      <span class="text-sm truncate">{{ fileName }}</span>
      <div class="flex items-center gap-2 ml-auto">
        <CollabUsers :users="collabUsers" />
        <CollabSession :connected="collabConnected" @connect="joinCollab" @disconnect="leaveCollab" />
      </div>
    </div>

    <div class="flex-1 min-h-0">
      <MarkdownEditor
        v-if="content !== null"
        v-model="content"
        :file-name="fileName"
        :is-dirty="isDirty"
        :is-saving="isSaving"
        @save="saveFile"
        @export="showExport = true"
      />
      <LoadingSpinner v-else-if="loading" class="h-full" />
      <ErrorAlert v-else :message="error || 'File not found'" class="m-4" />
    </div>

    <ExportDialog :open="showExport" @close="showExport = false" @export="handleExport" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/ui.store';
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue';
import ExportDialog from '@/components/editor/ExportDialog.vue';
import CollabUsers from '@/components/collab/CollabUsers.vue';
import CollabSession from '@/components/collab/CollabSession.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const route = useRoute();
const ui = useUiStore();

const fileId = route.params.id as string;
const fileName = ref('');
const content = ref<string | null>(null);
const savedContent = ref('');
const loading = ref(true);
const error = ref('');
const isSaving = ref(false);
const showExport = ref(false);
const collabConnected = ref(false);
const collabUsers = ref<{ id: string; username: string; color: string }[]>([]);

const isDirty = ref(false);
watch(content, (val) => {
  isDirty.value = val !== savedContent.value;
});

async function loadFile(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiClient<{ success: boolean; data: { name: string; content?: string } }>(`/files/${fileId}`);
    fileName.value = res.data.name;
    content.value = res.data.content || '';
    savedContent.value = content.value;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function saveFile(): Promise<void> {
  isSaving.value = true;
  try {
    await apiClient(`/files/${fileId}`, { method: 'PUT', body: JSON.stringify({ content: content.value }) });
    savedContent.value = content.value!;
    isDirty.value = false;
    ui.addToast('success', 'Saved');
  } catch (e) {
    ui.addToast('error', (e as Error).message);
  } finally {
    isSaving.value = false;
  }
}

function handleExport(format: string): void {
  const blob = new Blob([content.value || ''], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.value}.${format.includes('HTML') ? 'html' : format.includes('PDF') ? 'pdf' : 'md'}`;
  a.click();
  URL.revokeObjectURL(url);
}

function joinCollab(): void {
  collabConnected.value = true;
}

function leaveCollab(): void {
  collabConnected.value = false;
  collabUsers.value = [];
}

onMounted(loadFile);
</script>
