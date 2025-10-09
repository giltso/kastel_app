import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Test utilities for date functions
// These functions are extracted from src/routes/luz.tsx for testing

const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getWeekDates = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const monday = new Date(date);

  // Calculate days to subtract to get to Monday (1)
  // If it's Sunday (0), we need to go back 6 days, otherwise go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(date.getDate() - daysToSubtract);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    weekDates.push(currentDate.toISOString().split('T')[0]);
  }

  return weekDates;
};

const getMonthDates = (dateString: string) => {
  // Parse date components to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);

  // First day of the month in UTC
  const firstDay = new Date(Date.UTC(year, month - 1, 1));

  // Calculate start of calendar grid (Sunday of first week)
  const dayOfWeek = firstDay.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const startDate = new Date(Date.UTC(year, month - 1, 1 - dayOfWeek));

  // Generate 42 days (6 weeks) to cover the entire month view
  const monthDates = [];
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + i);
    monthDates.push(currentDate.toISOString().split('T')[0]);
  }

  return monthDates;
};

describe('Date Helper Functions', () => {
  describe('getTodayString', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const result = getTodayString();
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      expect(result).toMatch(regex);
    });

    it('should return the correct date when mocked', () => {
      const mockDate = new Date('2025-10-09T12:00:00Z');
      vi.setSystemTime(mockDate);

      const result = getTodayString();
      expect(result).toBe('2025-10-09');

      vi.useRealTimers();
    });

    it('should return consistent results when called multiple times in same day', () => {
      const mockDate = new Date('2025-12-25T08:30:00Z');
      vi.setSystemTime(mockDate);

      const result1 = getTodayString();
      const result2 = getTodayString();

      expect(result1).toBe(result2);
      expect(result1).toBe('2025-12-25');

      vi.useRealTimers();
    });
  });

  describe('getWeekDates', () => {
    it('should return 7 dates starting from Monday', () => {
      const result = getWeekDates('2025-10-09'); // Thursday
      expect(result).toHaveLength(7);
    });

    it('should return Monday to Sunday for a Thursday date', () => {
      const result = getWeekDates('2025-10-09'); // Thursday, Oct 9
      expect(result[0]).toBe('2025-10-06'); // Monday
      expect(result[1]).toBe('2025-10-07'); // Tuesday
      expect(result[2]).toBe('2025-10-08'); // Wednesday
      expect(result[3]).toBe('2025-10-09'); // Thursday
      expect(result[4]).toBe('2025-10-10'); // Friday
      expect(result[5]).toBe('2025-10-11'); // Saturday
      expect(result[6]).toBe('2025-10-12'); // Sunday
    });

    it('should handle Monday correctly (start of week)', () => {
      const result = getWeekDates('2025-10-06'); // Monday
      expect(result[0]).toBe('2025-10-06'); // Same Monday
      expect(result[6]).toBe('2025-10-12'); // Following Sunday
    });

    it('should handle Sunday correctly (end of week)', () => {
      const result = getWeekDates('2025-10-12'); // Sunday
      expect(result[0]).toBe('2025-10-06'); // Previous Monday
      expect(result[6]).toBe('2025-10-12'); // Same Sunday
    });

    it('should handle month boundaries correctly', () => {
      const result = getWeekDates('2025-10-01'); // Wednesday, Oct 1
      expect(result[0]).toBe('2025-09-29'); // Monday in September
      expect(result[6]).toBe('2025-10-05'); // Sunday in October
    });

    it('should handle year boundaries correctly', () => {
      const result = getWeekDates('2025-01-01'); // Wednesday, Jan 1
      expect(result[0]).toBe('2024-12-30'); // Monday in previous year
      expect(result[6]).toBe('2025-01-05'); // Sunday in new year
    });

    it('should handle leap year dates correctly', () => {
      const result = getWeekDates('2024-02-29'); // Thursday, leap day
      expect(result).toHaveLength(7);
      expect(result[3]).toBe('2024-02-29');
    });
  });

  describe('getMonthDates', () => {
    it('should return exactly 42 dates (6 weeks)', () => {
      const result = getMonthDates('2025-10-09');
      expect(result).toHaveLength(42);
    });

    it('should start with Sunday of the first week', () => {
      const result = getMonthDates('2025-10-09'); // October 2025
      // October 1, 2025 is Wednesday (day 3)
      // So the first Sunday is September 28, 2025
      expect(result[0]).toBe('2025-09-28');
    });

    it('should include the first day of the month', () => {
      const result = getMonthDates('2025-10-09');
      expect(result).toContain('2025-10-01');
    });

    it('should include the last day of the month', () => {
      const result = getMonthDates('2025-10-09');
      expect(result).toContain('2025-10-31');
    });

    it('should handle months starting on Sunday', () => {
      const result = getMonthDates('2025-06-15'); // June 2025 starts on Sunday
      expect(result[0]).toBe('2025-06-01'); // First day should be June 1
    });

    it('should handle months starting on Saturday', () => {
      const result = getMonthDates('2025-11-15'); // November 2025 starts on Saturday
      expect(result[0]).toBe('2025-10-26'); // Should start with Sunday of previous week
    });

    it('should handle February in leap year', () => {
      const result = getMonthDates('2024-02-15');
      expect(result).toContain('2024-02-29'); // Leap day
      expect(result).toHaveLength(42);
    });

    it('should handle February in non-leap year', () => {
      const result = getMonthDates('2025-02-15');
      expect(result).toContain('2025-02-28'); // Last day of Feb
      expect(result).not.toContain('2025-02-29'); // No leap day
      expect(result).toHaveLength(42);
    });

    it('should handle year boundaries', () => {
      const result = getMonthDates('2025-01-15'); // January 2025
      // Should include some days from December 2024
      expect(result[0].startsWith('2024-12')).toBe(true);
    });

    it('should return dates in chronological order', () => {
      const result = getMonthDates('2025-10-09');
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1]);
        const currDate = new Date(result[i]);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should handle different date inputs in same month consistently', () => {
      const result1 = getMonthDates('2025-10-01');
      const result2 = getMonthDates('2025-10-15');
      const result3 = getMonthDates('2025-10-31');

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('getWeekDates should throw on invalid dates', () => {
      expect(() => getWeekDates('invalid-date')).toThrow();
    });

    it('getMonthDates should throw on invalid dates', () => {
      expect(() => getMonthDates('invalid-date')).toThrow();
    });

    it('should handle dates far in the past', () => {
      const result = getWeekDates('1900-01-01');
      expect(result).toHaveLength(7);
    });

    it('should handle dates far in the future', () => {
      const result = getWeekDates('2100-12-31');
      expect(result).toHaveLength(7);
    });
  });
});
