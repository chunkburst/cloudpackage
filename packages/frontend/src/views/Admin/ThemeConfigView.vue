<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ $t('admin.themes') }}</h2>
      <button class="btn-primary !text-xs" @click="createTheme">+ New Theme</button>
    </div>

    <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />

    <ThemeSelector
      v-if="themes.length > 0"
      :themes="themes"
      :active-id="activeId"
      @select="setActive"
    />

    <div v-if="activeId" class="mt-6">
      <h3 class="text-sm font-medium mb-3">Customize</h3>
      <ThemeCustomizer :config="currentConfig" @update="updateConfig" />
      <button class="btn-primary !text-xs mt-4" @click="saveTheme">Save Theme</button>
    </div>

    <p v-if="themes.length === 0" class="text-sm text-gray-400 text-center py-8">No themes</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/ui.store';
import { useThemeStore } from '@/stores/theme.store';
import ThemeSelector from '@/components/theme/ThemeSelector.vue';
import ThemeCustomizer from '@/components/theme/ThemeCustomizer.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const ui = useUiStore();
const theme = useThemeStore();

interface Theme {
  id: string;
  name: string;
  config_json: string;
}

const themes = ref<Theme[]>([]);
const activeId = ref<string | null>(null);
const currentConfig = ref<Record<string, string>>({});
const error = ref('');

async function load(): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: Theme[] }>('/themes');
    themes.value = res.data;
    if (themes.value.length > 0) {
      activeId.value = themes.value[0].id;
      try {
        currentConfig.value = JSON.parse(themes.value[0].config_json);
      } catch { currentConfig.value = {}; }
    }
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function setActive(id: string): void {
  activeId.value = id;
  const t = themes.value.find((x) => x.id === id);
  if (t) {
    try { currentConfig.value = JSON.parse(t.config_json); } catch { currentConfig.value = {}; }
    theme.setActiveTheme(id);
  }
}

function updateConfig(config: Record<string, string>): void {
  currentConfig.value = config;
}

async function saveTheme(): Promise<void> {
  if (!activeId.value) return;
  try {
    await apiClient(`/themes/${activeId.value}`, {
      method: 'PUT',
      body: JSON.stringify({ config_json: JSON.stringify(currentConfig.value) }),
    });
    ui.addToast('success', 'Theme saved');
    load();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function createTheme(): Promise<void> {
  const name = prompt('Theme name:') || 'New Theme';
  try {
    await apiClient('/themes', {
      method: 'POST',
      body: JSON.stringify({ name, config_json: JSON.stringify(currentConfig.value) }),
    });
    ui.addToast('success', 'Theme created');
    load();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(load);
</script>
