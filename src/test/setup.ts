import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock i18next for tests
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key, // Return the key as the translation
    currentLanguage: 'en',
    isRTL: false,
    direction: 'ltr',
    changeLanguage: vi.fn(),
  }),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
