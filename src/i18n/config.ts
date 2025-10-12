import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// RTL languages list
export const RTL_LANGUAGES = ['he', 'ar'];

// Available languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', flag: '🇮🇱' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺', comingSoon: true },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷', comingSoon: true },
} as const;

export type SupportedLanguage = keyof typeof LANGUAGES;

// Helper function to check if a language is RTL
export const isRTL = (language: string): boolean => {
  return RTL_LANGUAGES.includes(language);
};

// Helper function to get text direction for a language
export const getLanguageDirection = (language: string): 'ltr' | 'rtl' => {
  return isRTL(language) ? 'rtl' : 'ltr';
};

i18n
  // Load translations from public/locales
  .use(HttpBackend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language is Hebrew (primary working language)
    lng: 'he',
    // Fallback language is English (easy to work with, source of truth)
    fallbackLng: 'en',
    // Supported languages
    supportedLngs: ['en', 'he', 'ru', 'fr'],
    // Debug mode (set to false in production)
    debug: import.meta.env.DEV,
    // Namespace organization
    ns: ['common', 'auth', 'shifts', 'tools', 'courses', 'roles'],
    defaultNS: 'common',
    // React options
    react: {
      useSuspense: true,
    },
    // Backend options for loading translation files
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    // Detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Update HTML direction attribute when language changes
i18n.on('languageChanged', (lng) => {
  const dir = getLanguageDirection(lng);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
});

export default i18n;
