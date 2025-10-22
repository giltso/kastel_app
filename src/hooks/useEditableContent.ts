import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from './useLanguage';
import { api } from '../../convex/_generated/api';

/**
 * Hook to load editable UI content
 * Priority: Database override > Translation file default
 */
export const useEditableContent = (contentKey: string, namespace = 'ui_content') => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();

  // Query database for custom override
  const override = useQuery(api.ui_content.getUIContent, {
    key: contentKey,
    language: currentLanguage,
  });

  // Fallback to translation file
  const defaultText = t(`${namespace}:${contentKey}`);

  // Priority: Database override > Translation file default
  const text = override?.text || defaultText;
  const needsTranslation = override?.needsTranslation || false;
  const isOverridden = !!override?.text;
  const isLoading = override === undefined;

  return {
    text,
    needsTranslation,
    isOverridden,
    isLoading,
    lastEditedAt: override?.lastEditedAt,
    lastEditedBy: override?.lastEditedBy,
  };
};
