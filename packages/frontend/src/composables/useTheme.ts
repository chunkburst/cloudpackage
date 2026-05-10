import { useThemeStore } from '@/stores/theme.store';

export function useTheme(): ReturnType<typeof useThemeStore> {
  return useThemeStore();
}
