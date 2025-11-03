import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Translation map for tests - extracted from public/locales/en/*.json
const translations: Record<string, string> = {
  // common.json
  'common:time.time': 'Time',
  'common:time.timeLabel': '⏱',
  'common:time.today': 'Today',
  'common:home.toolRentalTitle': 'Tool Rental',

  // shifts.json - LUZ section
  'shifts:luz.dailySchedule': 'Daily Schedule',
  'shifts:luz.weeklySchedule': 'Weekly Schedule',
  'shifts:luz.totalAssignments': 'Total Assignments',
  'shifts:luz.totalShifts': 'Total Shifts',
  'shifts:luz.totalCourses': 'Total Courses',
  'shifts:luz.noEvents': 'No events',

  // shifts.json - staffing section
  'shifts:staffing.noEventsScheduled': 'No events scheduled',
  'shifts:staffing.createFirstEvent': 'Create First Event',
  'shifts:staffing.status': 'Status',
  'shifts:staffing.students': 'students',
  'shifts:staffing.staffed': 'staffed',
  'shifts:staffing.understaffed': 'understaffed',
  'shifts:staffing.overstaffed': 'overstaffed',
};

// Mock i18next for tests
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, params?: any) => {
      // Try to get translation from map
      const translation = translations[key];
      if (translation) {
        // Handle interpolation if params provided
        if (params) {
          return Object.keys(params).reduce((str, param) => {
            return str.replace(`{{${param}}}`, params[param]);
          }, translation);
        }
        return translation;
      }
      // Fallback: return just the last part of the key
      return key.split(':').pop()?.split('.').pop() || key;
    },
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
