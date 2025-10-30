import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getHoursUntilShift,
  shouldAutoApproveManagerAssignment,
  shouldAutoApproveWorkerRequest,
  canWorkerEditAssignment,
} from './shiftTimeCalculations';

describe('shiftTimeCalculations', () => {
  describe('getHoursUntilShift', () => {
    beforeEach(() => {
      // Mock current time to October 30, 2025 at 12:00 PM (noon)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-30T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate positive hours for future shift', () => {
      // Shift is November 1, 2025 at 8:00 AM (2 days and 20 hours = 68 hours away)
      const result = getHoursUntilShift('2025-11-01', '08:00');
      expect(result).toBe(44); // 1.5 days later at 8AM = 44 hours
    });

    it('should calculate negative hours for past shift', () => {
      // Shift was October 29, 2025 at 8:00 AM (28 hours ago)
      const result = getHoursUntilShift('2025-10-29', '08:00');
      expect(result).toBe(-28);
    });

    it('should handle shift today but later', () => {
      // Shift is October 30, 2025 at 6:00 PM (6 hours from now)
      const result = getHoursUntilShift('2025-10-30', '18:00');
      expect(result).toBe(6);
    });

    it('should handle shift today but earlier', () => {
      // Shift was October 30, 2025 at 8:00 AM (4 hours ago)
      const result = getHoursUntilShift('2025-10-30', '08:00');
      expect(result).toBe(-4);
    });

    it('should handle shift exactly 48 hours away', () => {
      // Shift is November 1, 2025 at 12:00 PM (exactly 48 hours away)
      const result = getHoursUntilShift('2025-11-01', '12:00');
      expect(result).toBe(48);
    });

    it('should handle shift exactly 120 hours away', () => {
      // Shift is November 4, 2025 at 12:00 PM (exactly 120 hours = 5 days away)
      const result = getHoursUntilShift('2025-11-04', '12:00');
      expect(result).toBe(120);
    });

    it('should handle midnight shifts', () => {
      // Shift is November 1, 2025 at 00:00 (midnight)
      const result = getHoursUntilShift('2025-11-01', '00:00');
      expect(result).toBe(36); // 1.5 days = 36 hours
    });

    it('should handle late night shifts', () => {
      // Shift is October 31, 2025 at 23:30
      const result = getHoursUntilShift('2025-10-31', '23:30');
      expect(result).toBe(35.5); // 1 day + 11.5 hours
    });

    it('should handle shifts with minutes', () => {
      // Shift is October 30, 2025 at 14:30 (2.5 hours from now)
      const result = getHoursUntilShift('2025-10-30', '14:30');
      expect(result).toBe(2.5);
    });

    it('should handle far future shifts', () => {
      // Shift is November 30, 2025 at 12:00 PM (31 days = 744 hours away)
      const result = getHoursUntilShift('2025-11-30', '12:00');
      expect(result).toBe(744);
    });

    it('should handle different date formats correctly', () => {
      // Test with leading zeros
      const result = getHoursUntilShift('2025-11-05', '08:00');
      expect(result).toBeGreaterThan(0); // Should parse correctly
    });
  });

  describe('shouldAutoApproveManagerAssignment', () => {
    beforeEach(() => {
      // Mock current time to October 30, 2025 at 12:00 PM
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-30T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true when shift is >48 hours away', () => {
      // Shift is November 2, 2025 at 8:00 AM (more than 48 hours away)
      const result = shouldAutoApproveManagerAssignment('2025-11-02', '08:00');
      expect(result).toBe(true);
    });

    it('should return false when shift is exactly 48 hours away', () => {
      // Shift is November 1, 2025 at 12:00 PM (exactly 48 hours away)
      const result = shouldAutoApproveManagerAssignment('2025-11-01', '12:00');
      expect(result).toBe(false);
    });

    it('should return false when shift is <48 hours away', () => {
      // Shift is October 31, 2025 at 6:00 PM (30 hours away)
      const result = shouldAutoApproveManagerAssignment('2025-10-31', '18:00');
      expect(result).toBe(false);
    });

    it('should return false for shifts in the past', () => {
      // Shift was October 29, 2025 at 8:00 AM
      const result = shouldAutoApproveManagerAssignment('2025-10-29', '08:00');
      expect(result).toBe(false);
    });

    it('should handle boundary case: 48.1 hours away', () => {
      // Shift is November 1, 2025 at 12:06 PM (48.1 hours away)
      const result = shouldAutoApproveManagerAssignment('2025-11-01', '12:06');
      expect(result).toBe(true);
    });

    it('should handle boundary case: 47.9 hours away', () => {
      // Shift is November 1, 2025 at 11:54 AM (47.9 hours away)
      const result = shouldAutoApproveManagerAssignment('2025-11-01', '11:54');
      expect(result).toBe(false);
    });
  });

  describe('shouldAutoApproveWorkerRequest', () => {
    beforeEach(() => {
      // Mock current time to October 30, 2025 at 12:00 PM
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-30T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true when shift is >120 hours (5 days) away', () => {
      // Shift is November 5, 2025 at 8:00 AM (more than 120 hours away)
      const result = shouldAutoApproveWorkerRequest('2025-11-05', '08:00');
      expect(result).toBe(true);
    });

    it('should return false when shift is exactly 120 hours away', () => {
      // Shift is November 4, 2025 at 12:00 PM (exactly 120 hours = 5 days away)
      const result = shouldAutoApproveWorkerRequest('2025-11-04', '12:00');
      expect(result).toBe(false);
    });

    it('should return false when shift is <120 hours away', () => {
      // Shift is November 3, 2025 at 6:00 PM (less than 120 hours away)
      const result = shouldAutoApproveWorkerRequest('2025-11-03', '18:00');
      expect(result).toBe(false);
    });

    it('should return false for shifts in the past', () => {
      // Shift was October 28, 2025
      const result = shouldAutoApproveWorkerRequest('2025-10-28', '08:00');
      expect(result).toBe(false);
    });

    it('should handle boundary case: 120.1 hours away', () => {
      // Shift is November 4, 2025 at 12:06 PM (120.1 hours away)
      const result = shouldAutoApproveWorkerRequest('2025-11-04', '12:06');
      expect(result).toBe(true);
    });

    it('should handle boundary case: 119.9 hours away', () => {
      // Shift is November 4, 2025 at 11:54 AM (119.9 hours away)
      const result = shouldAutoApproveWorkerRequest('2025-11-04', '11:54');
      expect(result).toBe(false);
    });

    it('should handle far future shifts (1 month away)', () => {
      // Shift is November 30, 2025 (31 days = 744 hours away)
      const result = shouldAutoApproveWorkerRequest('2025-11-30', '12:00');
      expect(result).toBe(true);
    });
  });

  describe('canWorkerEditAssignment', () => {
    beforeEach(() => {
      // Mock current time to October 30, 2025 at 12:00 PM
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-30T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true when shift is >48 hours away', () => {
      // Shift is November 2, 2025 at 8:00 AM (more than 48 hours away)
      const result = canWorkerEditAssignment('2025-11-02', '08:00');
      expect(result).toBe(true);
    });

    it('should return false when shift is exactly 48 hours away', () => {
      // Shift is November 1, 2025 at 12:00 PM (exactly 48 hours away)
      const result = canWorkerEditAssignment('2025-11-01', '12:00');
      expect(result).toBe(false);
    });

    it('should return false when shift is <48 hours away', () => {
      // Shift is October 31, 2025 at 6:00 PM (30 hours away)
      const result = canWorkerEditAssignment('2025-10-31', '18:00');
      expect(result).toBe(false);
    });

    it('should return false for shifts in the past', () => {
      // Shift was yesterday
      const result = canWorkerEditAssignment('2025-10-29', '08:00');
      expect(result).toBe(false);
    });

    it('should return false for shifts happening today', () => {
      // Shift is today at 6:00 PM (6 hours away)
      const result = canWorkerEditAssignment('2025-10-30', '18:00');
      expect(result).toBe(false);
    });

    it('should handle boundary case: 48.1 hours away', () => {
      // Shift is November 1, 2025 at 12:06 PM
      const result = canWorkerEditAssignment('2025-11-01', '12:06');
      expect(result).toBe(true);
    });

    it('should handle boundary case: 47.9 hours away', () => {
      // Shift is November 1, 2025 at 11:54 AM
      const result = canWorkerEditAssignment('2025-11-01', '11:54');
      expect(result).toBe(false);
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-30T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle single-digit hours and minutes', () => {
      const result = getHoursUntilShift('2025-10-31', '8:5');
      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(20 + 5/60, 1); // ~20.08 hours
    });

    it('should handle year boundaries', () => {
      // Shift is January 1, 2026
      const result = getHoursUntilShift('2026-01-01', '00:00');
      expect(result).toBeGreaterThan(1400); // More than 2 months away
    });

    it('should handle month boundaries', () => {
      // Shift is November 1, 2025 at 00:00
      const result = getHoursUntilShift('2025-11-01', '00:00');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(48); // Less than 2 days
    });

    it('should handle leap year dates', () => {
      // Set to Feb 28, 2024 (leap year)
      vi.setSystemTime(new Date('2024-02-28T12:00:00'));
      // Shift is Feb 29, 2024
      const result = getHoursUntilShift('2024-02-29', '12:00');
      expect(result).toBe(24);
    });
  });

  describe('relationship between functions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-30T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('manager threshold (48h) should be stricter than worker edit (48h)', () => {
      // At exactly 48 hours, neither should allow
      expect(shouldAutoApproveManagerAssignment('2025-11-01', '12:00')).toBe(false);
      expect(canWorkerEditAssignment('2025-11-01', '12:00')).toBe(false);
    });

    it('worker request threshold (120h) should be much stricter than manager assignment (48h)', () => {
      // At 60 hours away: manager auto-approves, worker request requires approval
      expect(shouldAutoApproveManagerAssignment('2025-11-02', '00:00')).toBe(true);
      expect(shouldAutoApproveWorkerRequest('2025-11-02', '00:00')).toBe(false);
    });

    it('at 121 hours away, all three should allow action', () => {
      // November 4, 2025 at 1:00 PM (121 hours away)
      expect(shouldAutoApproveManagerAssignment('2025-11-04', '13:00')).toBe(true);
      expect(shouldAutoApproveWorkerRequest('2025-11-04', '13:00')).toBe(true);
      expect(canWorkerEditAssignment('2025-11-04', '13:00')).toBe(true);
    });

    it('at 24 hours away, none should allow action', () => {
      // October 31, 2025 at 12:00 PM (24 hours away)
      expect(shouldAutoApproveManagerAssignment('2025-10-31', '12:00')).toBe(false);
      expect(shouldAutoApproveWorkerRequest('2025-10-31', '12:00')).toBe(false);
      expect(canWorkerEditAssignment('2025-10-31', '12:00')).toBe(false);
    });
  });
});
