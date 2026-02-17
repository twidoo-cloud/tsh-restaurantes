import { create } from 'zustand';
import es from './locales/es.json';
import en from './locales/en.json';

export type Locale = 'es' | 'en';

const dictionaries: Record<Locale, Record<string, string>> = { es, en };

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'es';
  const saved = localStorage.getItem('pos_locale') as Locale;
  if (saved && dictionaries[saved]) return saved;
  const browserLang = navigator.language?.substring(0, 2);
  if (browserLang === 'en') return 'en';
  return 'es';
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale: Locale) => {
    if (typeof window !== 'undefined') localStorage.setItem('pos_locale', locale);
    set({ locale });
  },
}));

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = dictionaries[locale]?.[key] || dictionaries['es']?.[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

export function useTranslation() {
  const { locale, setLocale } = useI18nStore();
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  return { t, locale, setLocale };
}
