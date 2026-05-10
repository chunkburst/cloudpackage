import { useI18n as useVueI18n } from 'vue-i18n';
import { useUiStore } from '@/stores/ui.store';
import type { Composer } from 'vue-i18n';

interface I18nComposable {
  t: Composer['t'];
  locale: Composer['locale'];
  setLocale: (lang: 'zh-CN' | 'en') => void;
}

export function useI18n(): I18nComposable {
  const { t, locale } = useVueI18n();
  const ui = useUiStore();

  function setLocale(lang: 'zh-CN' | 'en'): void {
    locale.value = lang;
    ui.setLocale(lang);
  }

  return { t, locale, setLocale };
}
