import { useTranslation } from 'react-i18next';
import { getLanguageDirection, SupportedLanguage, LANGUAGES } from '@/i18n/config';

/**
 * Custom hook for language management with RTL support
 * Extends useTranslation with additional language-specific utilities
 */
export const useLanguage = () => {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language as SupportedLanguage;
  const direction = getLanguageDirection(currentLanguage);
  const isRTL = direction === 'rtl';

  const changeLanguage = async (language: SupportedLanguage) => {
    await i18n.changeLanguage(language);
  };

  const availableLanguages = Object.entries(LANGUAGES).map(([code, info]) => ({
    code: code as SupportedLanguage,
    ...info,
  }));

  return {
    t,
    i18n,
    currentLanguage,
    direction,
    isRTL,
    changeLanguage,
    availableLanguages,
  };
};
