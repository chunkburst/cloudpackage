import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

let toastId = 0;

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true);
  const toasts = ref<Toast[]>([]);
  const locale = ref<'zh-CN' | 'en'>('zh-CN');

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function addToast(type: ToastType, message: string, duration = 4000): void {
    const id = ++toastId;
    toasts.value.push({ id, type, message, duration });
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  function removeToast(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function setLocale(loc: 'zh-CN' | 'en'): void {
    locale.value = loc;
    localStorage.setItem('locale', loc);
  }

  return {
    sidebarOpen,
    toasts,
    locale,
    toggleSidebar,
    addToast,
    removeToast,
    setLocale,
  };
});
