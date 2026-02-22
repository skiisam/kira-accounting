import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ms from './locales/ms.json';
import zh from './locales/zh.json';
import id from './locales/id.json';
import th from './locales/th.json';
import my from './locales/my.json';
import vi from './locales/vi.json';
import km from './locales/km.json';

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ms', name: 'Bahasa Malaysia', flag: '🇲🇾' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
];

const resources = {
  en: { translation: en },
  ms: { translation: ms },
  zh: { translation: zh },
  id: { translation: id },
  th: { translation: th },
  my: { translation: my },
  vi: { translation: vi },
  km: { translation: km },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kira-language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
