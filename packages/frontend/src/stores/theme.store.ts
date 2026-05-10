import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '@/api/client';

interface ThemeRow {
  id: string;
  name: string;
  config_json: string;
  is_system: number;
  created_by: string | null;
}

interface ThemeConfig {
  [key: string]: string;
}

const defaultThemeConfig: ThemeConfig = {
  '--color-primary': '#3b82f6',
  '--color-bg': '#ffffff',
  '--color-surface': '#f9fafb',
  '--color-text': '#111827',
  '--color-border': '#e5e7eb',
  '--radius-sm': '0.25rem',
  '--radius-md': '0.375rem',
  '--radius-lg': '0.5rem',
};

export const useThemeStore = defineStore('theme', () => {
  const themes = ref<ThemeRow[]>([]);
  const activeThemeId = ref<string | null>(null);
  const darkMode = ref(false);
  const config = ref<ThemeConfig>({ ...defaultThemeConfig });

  const isDark = computed(() => darkMode.value);

  function applyConfig(cfg: ThemeConfig): void {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cfg)) {
      root.style.setProperty(key, value);
    }
    config.value = cfg;
  }

  function toggleDark(): void {
    darkMode.value = !darkMode.value;
    localStorage.setItem('darkMode', String(darkMode.value));
    document.documentElement.classList.toggle('dark', darkMode.value);
  }

  function restoreTheme(): void {
    const saved = localStorage.getItem('darkMode');
    darkMode.value = saved === 'true';
    document.documentElement.classList.toggle('dark', darkMode.value);
  }

  async function fetchThemes(): Promise<void> {
    const res = await apiClient<{ success: boolean; data: ThemeRow[] }>('/themes');
    themes.value = res.data;
  }

  async function setActiveTheme(id: string): Promise<void> {
    const theme = themes.value.find((t) => t.id === id);
    if (theme) {
      activeThemeId.value = id;
      try {
        const cfg = JSON.parse(theme.config_json) as ThemeConfig;
        applyConfig(cfg);
      } catch {
        applyConfig(defaultThemeConfig);
      }
      localStorage.setItem('activeTheme', id);
    }
  }

  return {
    themes,
    activeThemeId,
    darkMode,
    config,
    isDark,
    toggleDark,
    restoreTheme,
    fetchThemes,
    setActiveTheme,
    applyConfig,
  };
});
