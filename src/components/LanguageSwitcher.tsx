import { Languages } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, availableLanguages, t } = useLanguage();

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode as any);
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
        <Languages className="w-4 h-4" />
        <span className="hidden sm:inline">
          {availableLanguages.find((lang) => lang.code === currentLanguage)?.nativeName}
        </span>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-52 mt-2 z-50"
      >
        {availableLanguages.map((language) => {
          const isComingSoon = 'comingSoon' in language && language.comingSoon;
          return (
            <li key={language.code}>
              <button
                className={`flex items-center gap-3 ${
                  currentLanguage === language.code ? "active" : ""
                } ${isComingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !isComingSoon && handleLanguageChange(language.code)}
                disabled={isComingSoon}
              >
                <span className="text-2xl">{language.flag}</span>
                <div className="flex-1 text-start">
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs opacity-70">{language.name}</div>
                </div>
                {isComingSoon && (
                  <span className="badge badge-sm badge-ghost">
                    {t("common:actions.comingSoon")}
                  </span>
                )}
                {currentLanguage === language.code && !isComingSoon && (
                  <span className="text-primary">✓</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
